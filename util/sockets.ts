import * as v from "valibot";

import type { IOutput } from "./output.js";

import { entries, fromEntries } from "./object.js";
import { serializeHeaders } from "./tcp.js";

export type ISocketResponse = {
  body?: string;
  headers: Record<string, string | undefined>;
  statusCode: number;
};

const responseSchema = v.pipe(
  v.string(),
  v.transform((msg) => msg.split("\r\n")),
  v.transform(
    (lines): { body?: string[]; headers: string[]; status: string } => {
      const [status, ...nonStatus] = lines;

      const headerBodySplitIndex = nonStatus.findIndex((line) => {
        return line.length < 1;
      });

      const bodyEmpty = headerBodySplitIndex < 0;
      if (bodyEmpty) {
        return { headers: nonStatus, status };
      }

      const headers = nonStatus.slice(0, headerBodySplitIndex);
      const body = nonStatus.slice(headerBodySplitIndex + 1);

      return { body, headers, status };
    },
  ),
  v.transform((lines) => {
    // HTTP/1.1 200 OK
    // HTTP/1.1 500 Internal Server Error
    const [, statusCode] = lines.status.split(" ").map(Number);

    const headerEntries = lines.headers
      .map((headerLine) => {
        const [key, ...value] = headerLine.split(":");
        if (key == null || value.length < 1) {
          return undefined;
        }

        const headerName = key.toUpperCase();
        const headerValue = value.join(":").trim();

        return [headerName, headerValue] as const;
      })
      .filter((entry) => entry != null);

    const headers = fromEntries(headerEntries);
    if (!lines.body) {
      return { headers, statusCode };
    }

    const body = lines.body.join("\r\n");

    return { body, headers, statusCode };
  }),
  v.object({
    body: v.optional(v.string()),
    headers: v.record(v.string(), v.string()),
    statusCode: v.number(),
  }),
);

export type ISocket = {
  connect: (onConnect: () => void) => void;
  destroy(this: void): void;
  off(
    this: void,
    eventName: "data",
    onData: (buffer: IStringifiable) => void,
  ): void;
  off(this: void, eventName: "error", onError: (error: Error) => void): void;
  on(
    this: void,
    eventName: "data",
    onData: (buffer: IStringifiable) => void,
  ): void;
  on(this: void, eventName: "error", onError: (error: Error) => void): void;
  write: (data: string) => void;
};

export type ISocketRequest = {
  body?: string;
  headers: Record<string, string>;
  method: "POST";
  output: IOutput;
  pathname: string;
  protocol?: "HTTP/1.1";
  socket: ISocket;
};

type IStringifiable = { toString: () => string };

type RequestArgs = {
  onResponse: (response: ISocketResponse) => void;
  output: IOutput;
};

export async function request({
  body,
  headers = {},
  method,
  output,
  pathname,
  protocol = "HTTP/1.1",
  socket,
}: ISocketRequest): Promise<ISocketResponse> {
  return new Promise<ISocketResponse>((resolve, reject) => {
    const onData = createResponseHandler({ onResponse, output });

    const cleanup = () => {
      output.debug(`cleaning up sockets`);

      socket.off("data", onData);
      socket.off("error", onError);
      socket.destroy();
    };

    function onResponse(this: void, response: ISocketResponse) {
      cleanup();

      resolve(response);
      output.debug(
        `resolved with socket response: ${JSON.stringify(response, null, 2)}`,
      );
    }

    function onError(this: void, error: Error) {
      cleanup();

      reject(error);
      output.error(`rejected with error: ${error}`);
    }

    function onConnect(this: void) {
      const command = [
        `${method} ${pathname} ${protocol}`,
        serializeHeaders(entries(headers)),
        "",
        body,
      ]
        .filter((line) => line != null)
        .join("\r\n");

      socket.write(command);
      output.debug(`wrote command: ${command}`);
    }

    socket.on("data", onData);
    socket.on("error", onError);
    socket.connect(onConnect);
  });
}

function createPartialResponseQueue<T>() {
  let current = null as null | T;

  const pop = (): null | T => {
    const popped = current;
    current = null;

    return popped;
  };

  const push = (value: T): void => {
    current = value;
  };

  return { pop, push };
}

function createResponseHandler({
  onResponse: onResponseArg,
  output,
}: RequestArgs) {
  const partialResponseQueue = createPartialResponseQueue<ISocketResponse>();

  /**
   * Prevents consumer errors from breaking handling in `onData`
   */
  const onResponse = (response: ISocketResponse) => {
    try {
      onResponseArg(response);
    } catch (error) {
      output.error(`error in onResponse callback: ${error}`);
    }
  };

  /**
   * Requests need to be chained together because we may see bodies separated
   * from their headers. We can, thankfully, rely on the single-threaded and
   * concurrent model of these requests, however. That is to say that each
   * call to onData will not be performed until its predecessor has finished.
   * That is also to say that we will not see responses interwoven with one
   * another.
   */
  const onData = (buffer: { toString: () => string }) => {
    const message = buffer.toString();
    output.debug(`Data received: ${message}`);

    const partialResponse = partialResponseQueue.pop();

    try {
      const response = v.parse(responseSchema, message);

      // Check actual content length vs. expected
      const expectedContentLength = getContentLength(response.headers);
      const contentLength = Buffer.byteLength(response.body ?? "");

      // We have a complete response, invoke the callback
      const toBeContinued = contentLength < expectedContentLength;
      if (!toBeContinued) {
        output.debug(
          `Complete response for ${message}: ${JSON.stringify(response, null, 2)}`,
        );
        onResponse(response);
        return;
      }

      if (partialResponse != null) {
        output.error(
          `Expected response body, but received another response before body. Notifying consumers of partial response: ${JSON.stringify(partialResponse, null, 2)}`,
        );
        onResponse(partialResponse);
      }

      output.debug(
        `Got headers, expecting body to follow: ${JSON.stringify(response, null, 2)}`,
      );
      partialResponseQueue.push(response);
    } catch (error) {
      // Failure to parse or some other failure— report and move on
      if (partialResponse == null) {
        output.error(`Error processing message: ${message}\n\n${error}`);
        return;
      }

      // Interpret the current message as a body
      const { body: partialBody = "" } = partialResponse;
      const response = { ...partialResponse, body: `${partialBody}${message}` };

      const expectedContentLength = getContentLength(response.headers);
      const contentLength = Buffer.byteLength(response.body);
      if (contentLength < expectedContentLength) {
        output.debug(
          `Partial body received (${contentLength}/${expectedContentLength}). Waiting to fill content length. Message: ${message}. Partial response: ${response}`,
        );
        partialResponseQueue.push(response);
        return;
      }

      output.debug(`Completed response: ${JSON.stringify(response, null, 2)}`);
      onResponse(response);
    }
  };

  return onData;
}

function getContentLength(headers: Record<string, string | undefined>): number {
  return Number(headers["CONTENT-LENGTH"] ?? 0);
}
