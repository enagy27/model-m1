import { fromEntries } from "./object.js";
import type { IOutput } from "./output.js";
import { search } from "./upnp.js";

export type DeviceData = {
  manufacturer: string;
  modelName: string;
};

type IDgramSocket = {
  bind(this: void): void;
  send(this: void, msg: string): void;

  on(this: void, eventName: "listening", listener: () => void): void;
  on(
    this: void,
    eventName: "message",
    listener: (msg: Pick<Buffer<ArrayBuffer>, "toString">) => void,
  ): void;
  on(this: void, eventName: "error", listener: (err: Error) => void): void;

  off(this: void, eventName: "listening", listener: () => void): void;
  off(
    this: void,
    eventName: "message",
    listener: (msg: Pick<Buffer<ArrayBuffer>, "toString">) => void,
  ): void;
  off(this: void, eventName: "error", listener: (err: Error) => void): void;
};

type GetServiceDeviceDescriptorUrlArgs = {
  host: string;
  socket: IDgramSocket;
  service: string;
  output: IOutput;
};

/**
 * Returns the first UPNP registered service location which matches the provided service
 * name.
 *
 * @example http://192.168.4.55:60006/upnp/desc/aios_device/aios_device.xml
 *
 * @param service the service to search for
 * @returns UPNP device information XML file endpoint
 */
export async function getServiceDeviceDescriptorUrl({
  host,
  socket,
  service,
  output,
}: GetServiceDeviceDescriptorUrlArgs): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off("listening", onListening);
      socket.off("message", onMessage);
      socket.off("error", onError);
    };

    function onListening(this: void) {
      const searchMessage = search({ host, service });

      output.debug(
        `getServiceDeviceDescriptorUrl: sending search: ${searchMessage}`,
      );
      socket.send(searchMessage);

      // fire once
      socket.off("listening", onListening);
    }

    function onMessage(this: void, buffer: { toString: () => string }) {
      const message = buffer.toString();

      const [, ...headerLines] = message.split("\r\n");
      const headers = fromEntries(
        headerLines.map((line): [string, string | undefined] => {
          const [key, ...valueParts] = line.split(":");

          return [key, valueParts.join(":").trim()] as const;
        }),
      );

      const { ST, LOCATION } = headers;
      output.debug(
        `getServiceDeviceDescriptorUrl: Message received on UPNP socket with ST="${ST}" and LOCATION="${LOCATION}"`,
      );

      if (ST !== service || !LOCATION) {
        return;
      }

      resolve(LOCATION);

      cleanup();
    }

    function onError(this: void, err: Error) {
      output.error(`getServiceDeviceDescriptorUrl: UPNP socket error ${err}`);
      reject(err);

      cleanup();
    }

    socket.on("listening", onListening);
    socket.on("message", onMessage);
    socket.on("error", onError);

    socket.bind();
    output.debug("getServiceDeviceDescriptorUrl: Bound socket for UPNP");
  });
}
