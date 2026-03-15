import dgram from "dgram";
import { XMLParser } from "fast-xml-parser";
import * as v from "valibot";

import { upnp } from "./upnp";

const UPNP_ADDRESS = "239.255.255.250" as const;
const UPNP_PORT = 1900 as const;

const deviceXmlSchema = v.object({
  root: v.object({
    device: v.object({
      manufacturer: v.string(),
      modelName: v.string(),
    }),
  }),
});

export type DeviceData = {
  manufacturer: string;
  modelName: string;
};

export async function getDeviceLocation(service: string): Promise<string> {
  const xml = new XMLParser();

  const upnpSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const upnpClient = upnp({
    host: `${UPNP_ADDRESS}:${UPNP_PORT}`,
    send: (message) => upnpSocket.send(message, UPNP_PORT, UPNP_ADDRESS),
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
