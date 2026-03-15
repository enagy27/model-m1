import * as v from "valibot";

type ISocket = {
  send: (message: string) => void;
  readonly host: `${string}:${number}`;
};

const responseSchema = v.pipe(
  v.string(),
  v.transform((msg) => msg.split("\r\n")),
  v.transform((lines) => {
    const [statusLine, ...headersLines] = lines;
    const ok = statusLine.startsWith("HTTP/1.1 200 OK");
    if (!ok) {
      return { success: false } as const;
    }

    const headerEntries = headersLines
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

    return {
      success: true,
      headers: Object.fromEntries(headerEntries),
    } as const;
  }),
);

export function upnp(socket: ISocket) {
  const search = (service: string) => {
    const message = [
      `M-SEARCH * HTTP/1.1`,
      `HOST: ${socket.host}`,
      `MAN: "ssdp:discover"`,
      `ST: ${service}`,
      `MX: 3`,
      ``,
      ``,
    ].join("\r\n");

    socket.send(message);
  };

  const parseResponse = (message: string) => {
    return v.parse(responseSchema, message);
  };

  return { search, parseResponse };
}
