import net from "net";
import * as v from "valibot";
import { Command, InvalidOptionArgumentError, Option } from "commander";
import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";

import { createControlClient } from "../util/createControlClient";
import {
  defaultActControlPort,
  defaultActControlUrl,
  inputPiped,
  defaultRenderingControlUrl,
} from "../env";
import { receiverSettingsSchema } from "../util/receiverSettings";
import { read as readStream } from "../util/streams";
import { getOutput } from "../util/output";
import * as discover from "./discover";
import * as options from "../util/options";
import { Renewable } from "../util/Renewable";
import type { CreateClientArgs } from "../util/createEndpoint";
import { createRenderingControlClient } from "../util/createRenderingControlClient";
import receiverSettingsSchemaJson from "../receiverSettings.schema.json" with { type: "json" };
import { applySettings } from "../util/applySettings";
import {
  jsonSchemaToOption,
  parseAsJsonSchema,
} from "../util/jsonSchemaToOption";
import { entries } from "../util/object";

const setConfigInputSchema = v.object({
  ...receiverSettingsSchema.entries,
  hostname: v.optional(v.pipe(v.string(), v.ipv4())),
  port: v.optional(v.number(), defaultActControlPort),
  actControlUrl: v.optional(v.string(), defaultActControlUrl),
  renderingControlUrl: v.optional(v.string(), defaultRenderingControlUrl),
  logLevel: v.picklist(options.logLevels),
});

const pipedInputSchema = discover.pipedOutputSchema;

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
      "Set individual receiver settings. Each setting can be specified as a command-line option.",
    )
    .addOption(options.hostname)
    .addOption(options.port)
    .addOption(options.actControlUrl)
    .addOption(options.renderingControlUrl)
    .addOption(options.logLevel),
).action(async (opts: Record<string, unknown>) => {
  const stdinData = inputPiped ? await readStream(process.stdin) : undefined;
  const parsedPipedInputs = v.safeParse(pipedInputSchema, stdinData);
  const pipedInputs = parsedPipedInputs.success ? parsedPipedInputs.output : {};

  const parsedOptions = v.parse(setConfigInputSchema, opts);

  const {
    logLevel,
    hostname = pipedInputs.hostname,
    port = pipedInputs.port ?? defaultActControlPort,
    actControlUrl = pipedInputs.actControlUrl ?? defaultActControlUrl,
    renderingControlUrl = pipedInputs.renderingControlUrl ??
      defaultRenderingControlUrl,
    ...settingsOptions
  } = parsedOptions;

  if (hostname == null) {
    throw new InvalidOptionArgumentError(
      `"hostname" is required. It can be retrieved using the "discover" command and can be piped to the "set-config" command directly as "discover | set-config --sound-mode stereo"`,
    );
  }

  // Extract only the receiver settings that were provided
  const receiverSettings = v.parse(receiverSettingsSchema, settingsOptions);

  const output = getOutput({ logLevel });
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
    await applySettings({
      controlClient,
      renderingControlClient,
      receiverSettings,
      output,
    });

    output.log("Settings applied successfully.");
  } finally {
    socket.destroy();
  }
});
