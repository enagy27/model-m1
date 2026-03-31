#!/usr/bin/env node

import net from "net";
import fs from "fs/promises";
import pathUtils from "path";
import * as v from "valibot";
import dgram from "dgram";
import chalk from "chalk";
import { Command, Option } from "commander";

import { awaitAtMost, sleep } from "./util/async";
import { getServiceDeviceDescriptorUrl } from "./util/getServiceDeviceDescriptorUrl";
import { AiosDevice, getAiosDevice } from "./util/getAiosDevice";
import { findDevices } from "./util/findDevices";
import { control, ControlInstance } from "./util/control";
import {
  upnpService,
  upnpAddress,
  upnpPort,
  defaultAiosControlPort,
  defaultAiosControlPathname,
} from "./env";
import * as sockets from "./util/sockets";
import {
  ReceiverSettings,
  receiverSettingsSchema,
} from "./util/receiverSettings";
import { getConfigsFromReceiverSettings } from "./util/getConfigsFromReceiverSettings";
import { entries, isEmptyObject } from "./util/object";

type IOutput = {
  log(this: void, info: string): void;
  debug(this: void, info: string): void;
  error(this: void, err: string): void;
};

type DiscoverArgs = {
  friendlyName?: string;
  modelName?: string;
  output: IOutput;
};

async function discover({ friendlyName, modelName, output }: DiscoverArgs) {
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

type ReadSettingsFileArgs = {
  path: string;
  output: IOutput;
};

async function readSettingsFile({
  path,
  output,
}: ReadSettingsFileArgs): Promise<ReceiverSettings> {
  try {
    const resolvedPath = pathUtils.resolve(path);
    output.debug(
      `readSettingsFile: Settings file path resolved to: "${resolvedPath}"`,
    );

    const receiverSettingsTextData = await fs.readFile(resolvedPath, "utf-8");
    output.debug(`readSettingsFile: Successfully read settings file`);

    return v.parse(
      receiverSettingsSchema,
      JSON.parse(receiverSettingsTextData),
    );
  } catch (error) {
    output.error(`readSettingsFile: Failed to read settings file: "${path}"`);
    throw error;
  }
}

type ApplySettingsArgs = {
  controller: ControlInstance;
  receiverSettings: ReceiverSettings;
  output: IOutput;
};

async function applySettings({
  controller,
  receiverSettings,
  output,
}: ApplySettingsArgs) {
  const configs = getConfigsFromReceiverSettings(receiverSettings);

  for (const [command, config] of entries(configs)) {
    if (config == null) {
      output.debug(`applySettings: skipping "${command}"`);
      continue;
    }

    if (typeof config === "object" && isEmptyObject(config)) {
      output.debug(`applySettings: skipping "${command}"`);
      return;
    }

    output.debug(
      `applySettings: command="${command}" with config: ${JSON.stringify(config, null, 2)}`,
    );

    switch (command) {
      case "AudioConfig": {
        await controller("SetAudioConfig", {
          AudioConfig: { AudioConfig: config },
        });

        continue;
      }

      case "LEDConfig": {
        await controller("SetLEDConfig", {
          LEDConfig: { LEDConfig: config },
        });

        continue;
      }

      case "TVConfig": {
        await controller("SetTvConfig", {
          TvConfig: config,
        });

        continue;
      }

      case "VolumeLimit": {
        await controller("SetVolumeLimit", {
          VolumeLimit: config,
        });

        continue;
      }
    }
  }

  // wait for the socket to finish up
  await sleep(100);

  await controller("GetLEDConfig");

  // Wait for the response
  await sleep(1_000);
}

type CommandSchemaArgs = { name: string };

function commandSchema({ name }: CommandSchemaArgs) {
  return v.object({
    name: v.pipe(v.function(), v.returns(v.literal(name))),
  });
}

const logLevels = ["debug", "info"] as const;
type LogLevel = (typeof logLevels)[number];

const discoverInputSchema = v.tuple([
  v.object({
    friendlyName: v.optional(v.string()),
    modelName: v.optional(v.string()),
    timeout: v.number(),
    logLevel: v.picklist(logLevels),
  }),
  commandSchema({ name: "discover" }),
]);

const discoverSchema = v.pipe(
  discoverInputSchema,
  v.transform(([options]) => ({
    ...options,
    // Seconds to milliseconds
    timeout: options.timeout * 1_000,
  })),
);

const presetInputSchema = v.tuple([
  v.string(),
  v.object({
    hostname: v.pipe(v.string(), v.ipv4()),
    port: v.number(),
    pathname: v.string(),
    logLevel: v.picklist(logLevels),
  }),
  commandSchema({ name: "preset" }),
]);

const presetSchema = v.pipe(
  presetInputSchema,
  v.transform(([settingsFile, options]) => ({ ...options, settingsFile })),
);

const noop = () => {};

function getOutput(logLevel: LogLevel): IOutput {
  const debugFn = (info: string) => console.debug(chalk.cyan(info));

  return {
    log: (info) => console.log(info),
    debug: logLevel === "debug" ? debugFn : noop,
    error: (err) => console.error(chalk.red(err)),
  };
}

async function main(args: string[]): Promise<void> {
  const program = new Command()
    .name("marantz-model-m1-remote")
    .description("Remote control for the Marantz Model M1")
    .version("0.1.0");

  const logLevelOption = new Option(
    "--logLevel <LEVEL>",
    "Verbosity of logging",
  )
    .choices(logLevels)
    .default("info");

  program
    .command("discover")
    .description(
      "Uses universal plug-n-play to discover the Model M1 on the network. Returns an IP address which can be used to control the amplifier.",
    )
    .option("--friendlyName <NAME>", "The in-app name of the amplifier")
    .option("--timeout <VALUE>", "Discovery timeout in seconds", Number, 5)
    .addOption(logLevelOption)
    .action(async (...args: unknown[]) => {
      const { friendlyName, modelName, timeout, logLevel } = v.parse(discoverSchema, args);

      const output = getOutput(logLevel);

      output.debug(`main: Discovering devices`);

      try {
        const discovered = await awaitAtMost(
          discover({ friendlyName, modelName, output }),
          timeout,
        );

        entries(discovered).forEach(([name, value]) => {
          output.log(`${name}: ${value}`);
        });
      } catch (err) {
        output.error(
          `main: Failed to discover devices: ${err}`,
        );
      }
    });

  program
    .command("preset")
    .description("Applies a variety of settings at once.")
    .argument("<file>", "Preset settings file")
    .option(
      "--hostname <IP_ADDRESS>",
      "Host used for connecting to the device for control purposes",
    )
    .option(
      "--port <PORT>",
      "Port used for connecting to the device for control purposes",
      Number,
      defaultAiosControlPort,
    )
    .option(
      "--pathname <PATHNAME>",
      "SOAP control endpoint",
      defaultAiosControlPathname,
    )
    .addOption(logLevelOption)
    .action(async (...args: unknown[]) => {
      const { settingsFile, hostname, port, pathname, logLevel } = v.parse(
        presetSchema,
        args,
      );

      const output = getOutput(logLevel);

      output.debug(`main: Reading settingsFile="${settingsFile}"`);
      const receiverSettingsPromise = readSettingsFile({
        path: settingsFile,
        output,
      });

      const receiverSettings = await receiverSettingsPromise;
      output.debug(`main: Successfully parsed settings file`);

      const controlSocket = new net.Socket();

      controlSocket.on("data", (buffer) => {
        const message = buffer.toString();

        try {
          const response = sockets.response(message);

          output.debug(
            `main: ${response.statusCode} response received: ${message}`,
          );
        } catch (error) {
          output.debug(`main: data received: ${message}`);
        }
      });

      try {
        const promise = new Promise<void>((resolve, reject) => {
          const controller = control({
            host: `${hostname}:${port}`,
            pathname,
            write: (cmd) => controlSocket.write(cmd),
            output,
          });

          const onConnect = () => {
            void applySettings({ controller, receiverSettings, output })
              .then(() => {
                resolve();
              })
              .catch((err) => {
                output.error(`main: Failed to apply settings: ${err}`);
                reject(err);
              });
          };

          controlSocket.connect(port, hostname, onConnect);
        });

        await promise;
      } finally {
        controlSocket.destroy();
      }
    });

  try {
    await program.parseAsync(args);
    process.exit();
  } catch (err: unknown) {
    console.error(chalk.red(err));
    process.exit(1);
  }
}

// https://192.168.4.55/settings/index.html

void main(process.argv);
