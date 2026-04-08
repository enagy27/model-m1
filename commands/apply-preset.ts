import net from "net";
import fs from "fs/promises";
import pathUtils from "path";
import * as v from "valibot";
import { Command, InvalidOptionArgumentError } from "commander";
import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";

import { control, type ControlInstance } from "../util/control";
import {
  defaultAiosControlPort,
  defaultAiosControlPathname,
  inputPiped,
} from "../env";
import {
  type ReceiverSettings,
  receiverSettingsSchema,
} from "../util/receiverSettings";
import { getConfigsFromReceiverSettings } from "../util/getConfigsFromReceiverSettings";
import { entries, isEmptyObject } from "../util/object";
import { read as readStream } from "../util/streams";
import { getOutput, type IOutput } from "../util/output";
import * as discover from "./discover";
import * as options from "../util/options";
import { Renewable } from "../util/Renewable";

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

  for await (const [command, config] of entries(configs)) {
    if (config == null) {
      output.debug(`skipping "${command}"`);
      continue;
    }

    if (typeof config === "object" && isEmptyObject(config)) {
      output.debug(`skipping "${command}"`);
      continue;
    }

    output.debug(
      `command="${command}" with config: ${JSON.stringify(config, null, 2)}`,
    );

    switch (command) {
      case "AudioConfig": {
        await controller("SetAudioConfig", {
          AudioConfig: { AudioConfig: config },
        });
        break;
      }

      case "LEDConfig": {
        await controller("SetLEDConfig", {
          LEDConfig: { LEDConfig: config },
        });
        break;
      }

      case "TVConfig": {
        await controller("SetTvConfig", {
          TvConfig: config,
        });
        break;
      }

      case "VolumeLimit": {
        await controller("SetVolumeLimit", {
          VolumeLimit: config,
        });
        break;
      }
    }
  }
}

const applyPresetInputSchema = v.tuple([
  v.string(),
  v.object({
    hostname: v.optional(v.pipe(v.string(), v.ipv4())),
    port: v.optional(v.number(), defaultAiosControlPort),
    pathname: v.optional(v.string(), defaultAiosControlPathname),
    logLevel: v.picklist(options.logLevels),
  }),
]);

const applyPresetSchema = v.pipe(
  applyPresetInputSchema,
  v.transform(([settingsFile, options]) => {
    return { ...options, settingsFile };
  }),
);

const pipedInputSchema = discover.pipedOutputSchema;

export const applyPreset = new Command("apply-preset")
  .description("Applies a variety of settings at once.")
  .argument("<file>", "Preset settings file")
  .addOption(options.hostname)
  .addOption(options.port)
  .addOption(options.pathname)
  .addOption(options.logLevel)
  .action(async (...args: unknown[]) => {
    const stdinData = inputPiped ? await readStream(process.stdin) : undefined;
    const parsedPipedInputs = v.safeParse(pipedInputSchema, stdinData);
    const pipedInputs = parsedPipedInputs.success
      ? parsedPipedInputs.output
      : {};

    const {
      settingsFile,
      logLevel,
      hostname = pipedInputs.hostname,
      port = pipedInputs.port ?? defaultAiosControlPort,
      pathname = pipedInputs.pathname ?? defaultAiosControlPathname,
    } = v.parse(applyPresetSchema, args);

    if (hostname == null) {
      throw new InvalidOptionArgumentError(
        `"hostname" is required. It can be retrieved using the "discover" command and can be piped to the "apply-preset" command directly as "discover | apply-preset './preset.json'"`,
      );
    }

    const output = getOutput({ logLevel });

    output.debug(`Reading settingsFile="${settingsFile}"`);
    const receiverSettingsPromise = readSettingsFile({
      path: settingsFile,
      output,
    });

    const receiverSettings = await receiverSettingsPromise;
    output.debug(`Successfully parsed settings file`);

    const socket = new Renewable({
      create: () => new net.Socket(),
      destroy: (instance) => instance.destroy(),
    });

    const builder = new XMLBuilder({ ignoreAttributes: false });
    const parser = new XMLParser({ ignoreAttributes: false });

    const controller = control({
      host: `${hostname}:${port}`,
      pathname,
      output,
      build: (data) => builder.build(data),
      parse: (data) => parser.parse(data),
      socket: {
        write: (data) => socket.current.write(data),
        on: (eventName, cb) => socket.current.on(eventName, cb),
        off: (eventName, cb) => socket.current.off(eventName, cb),
        connect: (cb) => socket.current.connect(port, hostname, cb),
        destroy: () => socket.renew(),
      },
    });

    try {
      await applySettings({ controller, receiverSettings, output });
    } finally {
      socket.destroy();
    }
  });
