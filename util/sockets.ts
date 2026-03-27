import * as v from "valibot";
import { fromEntries } from "./object";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: false });

const responseSchema = v.pipe(
  v.string(),
  v.transform((msg) => msg.split("\r\n")),
  v.transform(
    (lines): { status: string; headers: string[]; body?: string[] } => {
      const [status, ...nonStatus] = lines;

      const headerBodySplitIndex = nonStatus.findIndex((line) => {
        line.length < 1;
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

    const body: unknown = xmlParser.parse(lines.body.join("\r\n"));

    return { statusCode, headers, body };
  }),
);

type UpnpResponse = v.InferOutput<typeof responseSchema>;

export function response(message: string): UpnpResponse {
  return v.parse(responseSchema, message);
}
