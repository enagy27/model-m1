import * as v from "valibot";
import { entries, fromEntries } from "./object";
import { IOutput } from "./output";
import { serializeHeaders } from "./tcp";

export type ISocketResponse = {
  statusCode: number;
  headers: Record<string, string | undefined>;
  body?: string;
};

const responseSchema = v.pipe(
  v.string(),
  v.transform((msg) => msg.split("\r\n")),
  v.transform(
    (lines): { status: string; headers: string[]; body?: string[] } => {
      const [status, ...nonStatus] = lines;

      const headerBodySplitIndex = nonStatus.findIndex((line) => {
        return line.length < 1;
      });

      const bodyEmpty = headerBodySplitIndex < 0;
      if (bodyEmpty) {
        return { status, headers: nonStatus };
      }

      const headers = nonStatus.slice(0, headerBodySplitIndex);
      const body = nonStatus.slice(headerBodySplitIndex + 1);

      return { status, headers, body };
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
      return { statusCode, headers };
    }

    const body = lines.body.join("\r\n");

    return { statusCode, headers, body };
  }),
  v.object({
    statusCode: v.number(),
    headers: v.record(v.string(), v.string()),
    body: v.optional(v.string()),
  }),
);

type RequestArgs = {
  output: IOutput;
  onResponse: (response: ISocketResponse) => void;
};

function createPartialResponseQueue<T>() {
  let current = null as T | null;

  const pop = (): T | null => {
    const popped = current;
    current = null;

    return popped;
  };

  const push = (value: T): void => {
    current = value;
  };

  return { push, pop };
}

function getContentLength(headers: Record<string, string | undefined>): number {
  return Number(headers["CONTENT-LENGTH"] ?? 0);
}

function createResponseHandler({
  output,
  onResponse: onResponseArg,
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

type IStringifiable = { toString: () => string };

export type ISocket = {
  write: (data: string) => void;
  connect: (onConnect: () => void) => void;
  on(
    this: void,
    eventName: "data",
    onData: (buffer: IStringifiable) => void,
  ): void;
  on(this: void, eventName: "error", onError: (error: Error) => void): void;
  off(
    this: void,
    eventName: "data",
    onData: (buffer: IStringifiable) => void,
  ): void;
  off(this: void, eventName: "error", onError: (error: Error) => void): void;
  destroy(this: void): void;
};

export type ISocketRequest = {
  socket: ISocket;
  output: IOutput;
  method: "POST";
  pathname: string;
  protocol?: "HTTP/1.1";
  headers: Record<string, string>;
  body?: string;
};

export async function request({
  socket,
  output,
  method,
  pathname,
  protocol = "HTTP/1.1",
  headers = {},
  body,
}: ISocketRequest): Promise<ISocketResponse> {
  return new Promise<ISocketResponse>((resolve, reject) => {
    const onData = createResponseHandler({ output, onResponse });

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
