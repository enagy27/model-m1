import dgram from "dgram";
import * as v from "valibot";
import { Command } from "commander";

import { awaitAtMost } from "../util/async";
import { getServiceDeviceDescriptorUrl } from "../util/getServiceDeviceDescriptorUrl";
import { AiosDevice, getAiosDevice } from "../util/getAiosDevice";
import { findDevices } from "../util/findDevices";
import { upnpService, upnpAddress, upnpPort } from "../env";
import { entries } from "../util/object";
import {
  getOutput,
  logLevelOption,
  logLevels,
  type IOutput,
} from "../util/commands";

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
    service: (service) => service.serviceType === upnpService,
  });

  const { hostname, port } = new URL(deviceDescriptorUrl);

  return { hostname, port: Number(port), devices };
}

const discoverInputSchema = v.tuple([
  v.object({
    friendlyName: v.optional(v.string()),
    modelName: v.optional(v.string()),
    timeout: v.number(),
    logLevel: v.picklist(logLevels),
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

export const discover = new Command()
  .name("discover")
  .description(
    "Uses universal plug-n-play to discover the Model M1 on the network. Returns an IP address which can be used to control the amplifier.",
  )
  .option("--friendlyName <NAME>", "The in-app name of the amplifier")
  .option("--timeout <VALUE>", "Discovery timeout in seconds", Number, 5)
  .addOption(logLevelOption)
  .action(async (...args: unknown[]) => {
    const { friendlyName, modelName, timeout, logLevel } = v.parse(
      discoverSchema,
      args,
    );

    const output = getOutput(logLevel);

    output.debug(`main: Discovering devices`);

    try {
      const discovered = await awaitAtMost(
        discoverImpl({ friendlyName, modelName, output }),
        timeout,
      );

      entries(discovered).forEach(([name, value]) => {
        output.log(`${name}: ${value}`);
      });
    } catch (err) {
      output.error(`main: Failed to discover devices: ${err}`);
    }
  });
