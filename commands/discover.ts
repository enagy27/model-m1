import dgram from "dgram";
import * as v from "valibot";
import { Command } from "commander";

import { getServiceDeviceDescriptorUrl } from "../util/getServiceDeviceDescriptorUrl";
import { type AiosDevice, getAiosDevice } from "../util/getAiosDevice";
import { findDevices } from "../util/findDevices";
import {
  upnpService,
  upnpAddress,
  upnpPort,
  outputPiped,
  upnpRenderingControlService,
} from "../env";
import { getOutput, type IOutput } from "../util/output";
import { awaitAtMost } from "../util/async";
import * as options from "../util/options";

type DiscoverArgs = {
  friendlyName?: string;
  modelName?: string;
  output: IOutput;
};

async function discoverImpl({ friendlyName, modelName, output }: DiscoverArgs) {
  let deviceDescriptorUrl: string | undefined;
  try {
    const socket = dgram.createSocket({
      type: "udp4",
      reuseAddr: true,
    });

    output.debug(
      `discover: Searching for device descriptor URL for service "${upnpService}"`,
    );
    deviceDescriptorUrl = await getServiceDeviceDescriptorUrl({
      host: `${upnpAddress}:${upnpPort}`,
      service: upnpService,
      output,
      socket: {
        bind: () => socket.bind(),
        on: (eventName, listener) => socket.on(eventName, listener),
        off: (eventName, listener) => socket.on(eventName, listener),
        send: (message) => socket.send(message, upnpPort, upnpAddress),
      },
    });
    output.debug(
      `discover: Successfully retrieved device descriptor URL "${deviceDescriptorUrl}" for service "${upnpService}"`,
    );
  } catch (error) {
    output.error(
      `discover: Failed to discover plug-n-play device: "${upnpService}"`,
    );
    throw error;
  }

  let aiosDevice: AiosDevice | undefined;
  try {
    output.debug(`discover: Getting AIOS device at "${deviceDescriptorUrl}"`);
    aiosDevice = await getAiosDevice(deviceDescriptorUrl);
    output.debug(
      `discover: Successfully got AIOS device at "${deviceDescriptorUrl}"`,
    );
  } catch (error) {
    output.error(
      `discover: Failed to retrieve device descriptor at ${deviceDescriptorUrl}`,
    );
    throw error;
  }

  const devices = findDevices(aiosDevice, {
    device: (device) => {
      return [
        friendlyName ? device.friendlyName === friendlyName : true,
        modelName ? device.modelName === modelName : true,
      ].every(Boolean);
    },
    service: ({ serviceType }) => {
      return (
        serviceType === upnpService ||
        serviceType === upnpRenderingControlService
      );
    },
  });

  const { hostname, port } = new URL(deviceDescriptorUrl);

  return { hostname, port: Number(port), devices };
}

const discoverInputSchema = v.tuple([
  v.object({
    friendlyName: v.optional(v.string()),
    modelName: v.optional(v.string()),
    timeout: v.number(),
    logLevel: v.picklist(options.logLevels),
  }),
]);

const discoverSchema = v.pipe(
  discoverInputSchema,
  v.transform(([options]) => ({
    ...options,
    // Seconds to milliseconds
    timeout: options.timeout * 1_000,
  })),
);

export const pipedOutputSchema = v.pipe(
  v.optional(v.string()),
  v.transform((stdin) => {
    if (stdin == null) {
      return undefined;
    }

    try {
      return JSON.parse(stdin);
    } catch {
      return undefined;
    }
  }),
  v.optional(
    v.object({
      hostname: v.pipe(v.string(), v.ipv4()),
      port: v.number(),
      devices: v.array(
        v.object({
          serviceList: v.object({
            service: v.array(v.object({ controlURL: v.string() })),
          }),
        }),
      ),
    }),
  ),
  v.transform((data) => {
    if (!data) {
      return {};
    }

    const { hostname, port, devices } = data;
    const [pathname] = devices.flatMap((device) => {
      return device.serviceList.service.map(({ controlURL }) => controlURL);
    });

    return { hostname, port, pathname };
  }),
);

export const discover = new Command()
  .name("discover")
  .description(
    "Uses universal plug-n-play to discover the Model M1 on the network. Returns an IP address which can be used to control the amplifier.",
  )
  .option("--friendlyName <NAME>", "The in-app name of the amplifier")
  .option("--timeout <VALUE>", "Discovery timeout in seconds", Number, 5)
  .addOption(options.logLevel)
  .action(async (...args: unknown[]) => {
    const { friendlyName, modelName, timeout, logLevel } = v.parse(
      discoverSchema,
      args,
    );

    const output = getOutput({ logLevel });

    try {
      const discovered = await awaitAtMost(
        discoverImpl({ friendlyName, modelName, output }),
        timeout,
      );

      if (outputPiped) {
        output.log(JSON.stringify(discovered));
        return;
      }

      const { hostname, port } = discovered;
      const flattenedDevicesAndServices = discovered.devices.flatMap(
        ({ serviceList, ...device }) => {
          return serviceList.service.map((service) => ({
            ...device,
            hostname,
            port,
            pathname: service.controlURL,
          }));
        },
      );

      output.table(flattenedDevicesAndServices);
    } catch (err) {
      output.error(`Failed to discover devices: ${err}`);
    }
  });
