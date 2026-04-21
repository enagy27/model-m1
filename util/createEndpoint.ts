import * as v from "valibot";

import packageJson from "#package.json" with { type: "json" };

import type { IOutput } from "./output.js";
import type { ISocket } from "./sockets.js";

import * as sockets from "./sockets.js";

const primitiveSchema = v.union([
  v.bigint(),
  v.boolean(),
  v.number(),
  v.string(),
]);

export type CreateClientArgs = {
  build(this: void, data: unknown): string;
  readonly host: string;
  readonly output: IOutput;
  parse(this: void, data: string): unknown;
  readonly pathname: string;
  readonly socket: ISocket;
};

type BodyArgs = {
  readonly action: string;
  build(this: void, data: unknown): string;
  readonly data: Record<string, unknown>;
  readonly service: string;
};

export function createEndpoint<
  Requests extends Record<string, never | Record<string, unknown>>,
  Responses extends Record<keyof Requests, (body: unknown) => unknown>,
>(args: { responses: Responses; service: string }) {
  const { responses, service } = args;

  return function createClient({
    build,
    host,
    output,
    parse,
    pathname,
    socket,
  }: CreateClientArgs) {
    return async function controlRequest<K extends keyof Requests & string>(
      ...args: Requests[K] extends never ? [K] : [K, Requests[K]]
    ): Promise<ReturnType<Responses[K]>> {
      const [action, data = {}] = args;

      output.debug(
        `control: invoking action="${action}" with data: ${JSON.stringify(data, null, 2)}`,
      );

      const body = createBody({ action, build, data, service });

      const contentLength = Buffer.byteLength(body);
      const headers = {
        "ACCEPT-RANGES": "bytes",
        "CONTENT-LENGTH": `${contentLength}`,
        "CONTENT-TYPE": `text/xml; charset="utf-8"`,
        HOST: host,
        SOAPACTION: `"${service}#${action}"`,
        "USER-AGENT": `${packageJson.name}/${packageJson.version}`,
      };

      const response = await sockets.request({
        body,
        headers,
        method: "POST",
        output,
        pathname,
        socket,
      });

      const xml = response.body ? parse(response.body) : undefined;

      const responseParser = responses[action];
      return responseParser(xml) as ReturnType<Responses[K]>;
    };
  };
}

function createBody({ action, build, data, service }: BodyArgs): string {
  const actionArgs = Object.fromEntries(
    Object.entries(data).map(([argName, value]: [string, unknown]) => {
      if (v.is(primitiveSchema, value)) {
        return [argName, value] as const;
      }

      return [argName, build(value)] as const;
    }),
  );

  const body = {
    "s:Envelope": {
      "@_s:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/",
      "@_xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",

      "s:Body": {
        [`u:${action}`]: {
          "@_xmlns:u": service,

          ...actionArgs,
        },
      },
    },
  };

  // Include the CRLF so that it is calculated as part of the CONTENT-LENGTH
  return `${build(body)}\r\n`;
}
