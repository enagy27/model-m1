import net from "net";
import * as v from "valibot";
import fs from "fs/promises";
import {
  Argument,
  Command,
  InvalidOptionArgumentError,
  Option,
} from "commander";
import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";

import { createControlClient } from "#util/createControlClient.js";
import {
  defaultActControlPort,
  defaultActControlUrl,
  inputPiped,
  defaultRenderingControlUrl,
} from "#env.js";
import {
  receiverSettingsSchema,
  type ReceiverSettings,
} from "#util/receiverSettings.js";
import { getConfigsFromReceiverSettings } from "#util/getConfigsFromReceiverSettings.js";
import { read as readStream } from "#util/streams.js";
import { getOutput, type IOutput } from "#util/output.js";
import * as discover from "./discover.js";
import * as getConfig from "./get-config.js";
import * as options from "#util/options.js";
import { Renewable } from "#util/Renewable.js";
import type { CreateClientArgs } from "#util/createEndpoint.js";
import { createRenderingControlClient } from "#util/createRenderingControlClient.js";
import receiverSettingsSchemaJson from "#receiverSettings.schema.json" with { type: "json" };
import {
  jsonSchemaToOption,
  parseAsJsonSchema,
} from "#util/jsonSchemaToOption.js";
import { entries, isEmptyObject } from "#util/object.js";
import { applyConfigs } from "#util/applyConfigs.js";
import { resolvePath } from "#util/path.js";

const setConfigInputSchema = v.tuple([
  v.optional(v.string()),
  v.object({
    ...receiverSettingsSchema.entries,
    hostname: v.optional(v.pipe(v.string(), v.ipv4())),
    port: v.number(),
    actControlUrl: v.string(),
    renderingControlUrl: v.string(),
    logLevel: v.picklist(options.logLevels),
  }),
]);

const setConfigSchema = v.pipe(
  setConfigInputSchema,
  v.transform(([relativePath, options]) => {
    const file = relativePath ? resolvePath(relativePath) : undefined;

    return { ...options, file };
  }),
);

const pipedInputSchema = v.union([
  discover.pipedOutputSchema,
  getConfig.pipedOutputSchema,
]);

type PipedInputs = v.InferOutput<typeof pipedInputSchema>;

/** Reads and parses piped input data */
async function getPipedInputs(stream: NodeJS.ReadStream): Promise<PipedInputs> {
  const stdinData = await readStream(stream);

  return v.parse(pipedInputSchema, stdinData);
}

type ReadSettingsFromFileArgs = {
  file: string;
  output: IOutput;
};

/** Reads and parses the `file` argument */
async function readSettingsFromFile({
  file,
  output,
}: ReadSettingsFromFileArgs): Promise<ReceiverSettings> {
  let contents: string;
  try {
    contents = await fs.readFile(file, "utf-8");
  } catch (error) {
    output.error(`Unable to read file: "${file}"`);
    throw error;
  }

  let data: unknown;
  try {
    data = JSON.parse(contents);
  } catch (error) {
    output.error(`Invalid JSON in file: "${file}"`);
    throw error;
  }

  try {
    return v.parse(receiverSettingsSchema, data);
  } catch (error) {
    output.error(
      "Settings file contains invalid data. Data should be similar to the response from get-config.",
    );
    throw error;
  }
}

/**
 * Assembles various input sources across:
 * - piped inputs from other commands
 * - settings from the `file` argument
 * - command line options
 */
async function getInputData(args: unknown[]) {
  // Command line arguments
  const options = v.parse(setConfigSchema, args);

  const { logLevel, file } = options;
  const output = getOutput({ logLevel });

  // Piped in data stream
  let pipedInputs: PipedInputs;
  try {
    pipedInputs = inputPiped ? await getPipedInputs(process.stdin) : {};
  } catch (error) {
    output.debug(`Failed to read input stream: ${error}`);
    pipedInputs = {};
  }

  // Settings file (`file` argument)
  const settingsFromFile = file
    ? await readSettingsFromFile({ file, output })
    : {};

  return { ...pipedInputs, ...settingsFromFile, ...options };
}

function withSettingsOptions(command: Command): Command {
  const optionDescriptors = entries(receiverSettingsSchemaJson.properties).map(
    ([name, unparsedSchema]) => {
      const schema = parseAsJsonSchema(unparsedSchema);

      return jsonSchemaToOption({ name, schema });
    },
  );

  const options = optionDescriptors.map(
    ({ flags, description, choices, argParser }) => {
      const withChoices = (opt: Option): Option => {
        return choices ? opt.choices(choices) : opt;
      };

      const withArgParser = (opt: Option): Option => {
        return argParser ? opt.argParser(argParser) : opt;
      };

      // Order matters here: withArgParser must run last
      return withArgParser(withChoices(new Option(flags, description)));
    },
  );

  options.forEach((option) => command.addOption(option));

  return command;
}

export const setConfig = withSettingsOptions(
  new Command("set-config")
    .description(
      "Set receiver config either via config file or individually via command line options. Accepts piped config data or discover data as well.",
    )
    .addArgument(new Argument("[file]", "Path to a config file"))
    .addOption(options.hostname())
    .addOption(options.port().default(defaultActControlPort))
    .addOption(options.actControlUrl().default(defaultActControlUrl))
    .addOption(
      options.renderingControlUrl().default(defaultRenderingControlUrl),
    )
    .addOption(options.logLevel()),
).action(async (...args: unknown[]) => {
  const inputs = await getInputData(args);
  const {
    logLevel,
    hostname,
    port,
    actControlUrl,
    renderingControlUrl,
    ...settingsOptions
  } = inputs;

  const output = getOutput({ logLevel });
  output.debug(`set-config input: ${JSON.stringify(inputs, null, 2)}`);

  if (hostname == null) {
    throw new InvalidOptionArgumentError(
      `"hostname" is required. It can be retrieved using the "discover" command and can be piped to the "set-config" command directly as "discover | set-config preset.json"`,
    );
  }

  // Extract only the receiver settings that were provided
  const receiverSettings = v.parse(receiverSettingsSchema, settingsOptions);

  if (isEmptyObject(receiverSettings)) {
    output.log(`No settings provided. No updates made.`);
    return;
  }

  output.debug(
    `Applying settings: ${JSON.stringify(receiverSettings, null, 2)}`,
  );

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
    const configs = getConfigsFromReceiverSettings(receiverSettings);

    await applyConfigs({
      controlClient,
      renderingControlClient,
      configs,
      output,
    });

    output.log("Settings applied successfully.");
  } finally {
    socket.destroy();
  }
});
