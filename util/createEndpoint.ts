import * as v from "valibot";

import type { IOutput } from "./output.js";
import * as sockets from "./sockets.js";
import type { ISocket } from "./sockets.js";
import packageJson from "#package.json" with { type: "json" };

const primitiveSchema = v.union([
  v.bigint(),
  v.boolean(),
  v.number(),
  v.string(),
]);

type BodyArgs = {
  readonly action: string;
  readonly data: Record<string, unknown>;
  readonly service: string;
  build(this: void, data: unknown): string;
};

function createBody({ action, data, build, service }: BodyArgs): string {
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
      "@_xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
      "@_s:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/",

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

export type CreateClientArgs = {
  readonly socket: ISocket;
  readonly host: string;
  readonly pathname: string;
  readonly output: IOutput;
  parse(this: void, data: string): unknown;
  build(this: void, data: unknown): string;
};

export function createEndpoint<
  Requests extends Record<string, Record<string, unknown> | never>,
  Responses extends Record<keyof Requests, (body: unknown) => unknown>,
>(args: { responses: Responses; service: string }) {
  const { service, responses } = args;

  return function createClient({
    socket,
    host,
    pathname,
    output,
    parse,
    build,
  }: CreateClientArgs) {
    return async function controlRequest<K extends string & keyof Requests>(
      ...args: Requests[K] extends never ? [K] : [K, Requests[K]]
    ): Promise<ReturnType<Responses[K]>> {
      const [action, data = {}] = args;

      output.debug(
        `control: invoking action="${action}" with data: ${JSON.stringify(data, null, 2)}`,
      );

      const body = createBody({ action, data, build, service });

      const contentLength = Buffer.byteLength(body);
      const headers = {
        HOST: host,
        "CONTENT-LENGTH": `${contentLength}`,
        "ACCEPT-RANGES": "bytes",
        "CONTENT-TYPE": `text/xml; charset="utf-8"`,
        SOAPACTION: `"${service}#${action}"`,
        "USER-AGENT": `${packageJson.name}/${packageJson.version}`,
      };

      const response = await sockets.request({
        socket,
        output,
        method: "POST",
        pathname,
        headers,
        body,
      });

      const xml = response.body ? parse(response.body) : undefined;

      const responseParser = responses[action];
      return responseParser(xml) as ReturnType<Responses[K]>;
    };
  };
}
