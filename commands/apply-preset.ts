import net from "net";
import fs from "fs/promises";
import pathUtils from "path";
import * as v from "valibot";
import { Command, InvalidOptionArgumentError } from "commander";
import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";

import { createControlClient } from "../util/createControlClient";
import {
  defaultActControlPort,
  defaultActControlUrl,
  inputPiped,
  defaultRenderingControlUrl,
} from "../env";
import {
  type ReceiverSettings,
  receiverSettingsSchema,
} from "../util/receiverSettings";
import { read as readStream } from "../util/streams";
import { getOutput, type IOutput } from "../util/output";
import * as discover from "./discover";
import * as options from "../util/options";
import { Renewable } from "../util/Renewable";
import type { CreateClientArgs } from "../util/createEndpoint";
import { createRenderingControlClient } from "../util/createRenderingControlClient";
import { applySettings } from "../util/applySettings";

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

const applyPresetInputSchema = v.tuple([
  v.string(),
  v.object({
    hostname: v.optional(v.pipe(v.string(), v.ipv4())),
    port: v.optional(v.number(), defaultActControlPort),
    actControlUrl: v.optional(v.string(), defaultActControlUrl),
    renderingControlUrl: v.optional(v.string(), defaultRenderingControlUrl),
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
  .addOption(options.actControlUrl)
  .addOption(options.renderingControlUrl)
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
      port = pipedInputs.port ?? defaultActControlPort,
      actControlUrl = pipedInputs.actControlUrl ?? defaultActControlUrl,
      renderingControlUrl = pipedInputs.renderingControlUrl ??
        defaultRenderingControlUrl,
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

    const clientArgs = {
      host: `${hostname}:${port}`,
      output,
      parse: (data) => parser.parse(data),
      build: (data) => builder.build(data),
      socket: {
        write: (data) => socket.current.write(data),
        on: (eventName, cb) => socket.current.on(eventName, cb),
        off: (eventName, cb) => socket.current.off(eventName, cb),
        connect: (cb) => socket.current.connect(port, hostname, cb),
        destroy: () => socket.renew(),
      },
    } satisfies Omit<CreateClientArgs, "pathname">;

    const controlClient = createControlClient({
      ...clientArgs,
      pathname: actControlUrl,
    });

    const renderingControlClient = createRenderingControlClient({
      ...clientArgs,
      pathname: renderingControlUrl,
    });

    try {
      await applySettings({
        controlClient,
        renderingControlClient,
        receiverSettings,
        output,
      });
    } finally {
      socket.destroy();
    }
  });
