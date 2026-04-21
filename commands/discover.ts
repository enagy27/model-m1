import { Command } from "commander";
import dgram from "dgram";
import * as v from "valibot";

import {
  outputPiped,
  upnpAddress,
  upnpPort,
  upnpRenderingControlService,
  upnpService,
} from "#env.js";
import { awaitAtMost } from "#util/async.js";
import { findDevices } from "#util/findDevices.js";
import { type AiosDevice, getAiosDevice } from "#util/getAiosDevice.js";
import { getServiceDeviceDescriptorUrl } from "#util/getServiceDeviceDescriptorUrl.js";
import { fromEntries } from "#util/object.js";
import * as options from "#util/options.js";
import { getOutput, type IOutput } from "#util/output.js";

type DiscoverArgs = {
  friendlyName?: string;
  modelName?: string;
  output: IOutput;
};

async function discoverImpl({ friendlyName, modelName, output }: DiscoverArgs) {
  let deviceDescriptorUrl: string | undefined;
  try {
    const socket = dgram.createSocket({
      reuseAddr: true,
      type: "udp4",
    });

    output.debug(
      `discover: Searching for device descriptor URL for service "${upnpService}"`,
    );
    deviceDescriptorUrl = await getServiceDeviceDescriptorUrl({
      host: `${upnpAddress}:${upnpPort}`,
      output,
      service: upnpService,
      socket: {
        bind: () => socket.bind(),
        off: (eventName, listener) => socket.on(eventName, listener),
        on: (eventName, listener) => socket.on(eventName, listener),
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

  return { devices, hostname, port: Number(port) };
}

const discoverInputSchema = v.tuple([
  v.object({
    friendlyName: v.optional(v.string()),
    logLevel: v.picklist(options.logLevels),
    modelName: v.optional(v.string()),
    timeout: v.number(),
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
      devices: v.array(
        v.object({
          serviceList: v.object({
            service: v.array(
              v.object({
                controlURL: v.string(),
                serviceType: v.string(),
              }),
            ),
          }),
        }),
      ),
      hostname: v.pipe(v.string(), v.ipv4()),
      port: v.number(),
    }),
  ),
  v.transform((data) => {
    if (!data) {
      return {};
    }

    const { devices, hostname, port } = data;

    const serviceTypeToControlUrlEntries = devices.flatMap((device) => {
      return device.serviceList.service.map(({ controlURL, serviceType }) => {
        return [serviceType, controlURL] as const;
      });
    });

    const serviceTypeToControlUrl = fromEntries(serviceTypeToControlUrlEntries);

    const actControlUrl = serviceTypeToControlUrl[upnpService];
    const renderingControlUrl =
      serviceTypeToControlUrl[upnpRenderingControlService];

    return { actControlUrl, hostname, port, renderingControlUrl };
  }),
);

export const discover = new Command()
  .name("discover")
  .description(
    "Uses universal plug-n-play to discover the Model M1 on the network. Returns an IP address which can be used to control the amplifier.",
  )
  .option("--friendlyName <NAME>", "The in-app name of the amplifier")
  .option("--modelName <NAME>", "Amplifier model (e.g. Model M1)")
  .option("--timeout <VALUE>", "Discovery timeout in seconds", Number, 5)
  .addOption(options.logLevel())
  .action(async (...args: unknown[]) => {
    const inputs = v.parse(discoverSchema, args);

    const { friendlyName, logLevel, modelName, timeout } = inputs;
    const output = getOutput({ logLevel });
    output.debug(`discover input: ${JSON.stringify(inputs, null, 2)}`);

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
          return serviceList.service.map(({ controlURL, serviceType }) => ({
            ...device,
            controlURL,
            hostname,
            port,
            serviceType,
          }));
        },
      );

      output.table(flattenedDevicesAndServices);
    } catch (err) {
      output.error(`Failed to discover devices: ${err}`);
    }
  });
