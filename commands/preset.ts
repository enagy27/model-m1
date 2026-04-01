import net from "net";
import fs from "fs/promises";
import pathUtils from "path";
import * as v from "valibot";
import { Command } from "commander";

import { sleep } from "../util/async";
import { control, ControlInstance } from "../util/control";
import { defaultAiosControlPort, defaultAiosControlPathname } from "../env";
import * as sockets from "../util/sockets";
import {
  ReceiverSettings,
  receiverSettingsSchema,
} from "../util/receiverSettings";
import { getConfigsFromReceiverSettings } from "../util/getConfigsFromReceiverSettings";
import { entries, isEmptyObject } from "../util/object";
import { getOutput, logLevelOption, logLevels, type IOutput } from "../util/commands";

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

const presetInputSchema = v.tuple([
  v.string(),
  v.object({
    hostname: v.pipe(v.string(), v.ipv4()),
    port: v.number(),
    pathname: v.string(),
    logLevel: v.picklist(logLevels),
  }),
]);

const presetSchema = v.pipe(
  presetInputSchema,
  v.transform(([settingsFile, options]) => ({ ...options, settingsFile })),
);

export const presetCommand = new Command("preset")
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
