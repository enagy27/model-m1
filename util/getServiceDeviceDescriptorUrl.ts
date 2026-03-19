import dgram from "dgram";

import { upnp } from "./upnp";
import { upnpAddress, upnpPort } from "../env";

export type DeviceData = {
  manufacturer: string;
  modelName: string;
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
export async function getServiceDeviceDescriptorUrl(service: string): Promise<string> {
  const upnpSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const upnpClient = upnp({
    host: `${upnpAddress}:${upnpPort}`,
    send: (message) => upnpSocket.send(message, upnpPort, upnpAddress),
  });

  return new Promise((resolve, reject) => {
    upnpSocket.on("listening", () => {
      upnpClient.search(service);
    });

    upnpSocket.on("message", (message) => {
      const response = upnpClient.parseResponse(message.toString());
      if (!response.success) {
        return;
      }

      const { ST, LOCATION } = response.headers;
      if (ST !== service || !LOCATION) {
        return;
      }

      resolve(LOCATION);
    });

    upnpSocket.on("error", (err) => {
      reject(err);
    });

    upnpSocket.bind();
  });
}
