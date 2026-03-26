import dgram from "dgram";
import { UpnpClient } from "./upnp";

export type DeviceData = {
  manufacturer: string;
  modelName: string;
};

type IDgramSocket = {
  bind(): void;
  on(eventName: "listening", listener: () => void): void;
  on(eventName: "message", listener: (msg: Pick<Buffer<ArrayBuffer>, "toString">) => void): void;
  on(eventName: "error", listener: (err: Error) => void): void;
}

type GetServiceDeviceDescriptorUrlArgs = {
  socket: IDgramSocket;
  client: UpnpClient;
  service: string;
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
  socket,
  client,
  service,
}: GetServiceDeviceDescriptorUrlArgs): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.on("listening", () => {
      client.search(service);
    });

    socket.on("message", (messageBuffer) => {
      const message = messageBuffer.toString();
      const response = client.parseResponse(message.toString());
      if (!response.success) {
        return;
      }

      const { ST, LOCATION } = response.headers;
      if (ST !== service || !LOCATION) {
        return;
      }

      resolve(LOCATION);
    });

    socket.on("error", (err) => {
      reject(err);
    });

    socket.bind();
  });
}
