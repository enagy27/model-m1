import { Command, InvalidOptionArgumentError } from "commander";
import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import net from "net";
import * as v from "valibot";

import type { CreateClientArgs } from "#util/createEndpoint.js";

import {
  defaultActControlPort,
  defaultActControlUrl,
  defaultRenderingControlUrl,
  inputPiped,
} from "#env.js";
import {
  type ControlClient,
  createControlClient,
} from "#util/createControlClient.js";
import {
  createRenderingControlClient,
  type RenderingControlClient,
} from "#util/createRenderingControlClient.js";
import {
  getReceiverSettingsFromConfigs,
  type GetReceiverSettingsFromConfigsArgs,
} from "#util/getReceiverSettingsFromConfigs.js";
import * as options from "#util/options.js";
import { getOutput } from "#util/output.js";
import { receiverSettingsSchema } from "#util/receiverSettings.js";
import { Renewable } from "#util/Renewable.js";
import { read as readStream } from "#util/streams.js";

import * as discover from "./discover.js";

const getConfigInputSchema = v.tuple([
  v.object({
    actControlUrl: v.string(),
    hostname: v.optional(v.pipe(v.string(), v.ipv4())),
    logLevel: v.picklist(options.logLevels),
    port: v.number(),
    renderingControlUrl: v.string(),
  }),
]);

const getConfigSchema = v.pipe(
  getConfigInputSchema,
  v.transform(([options]) => ({ ...options })),
);

const pipedInputSchema = discover.pipedOutputSchema;

type PipedInputs = v.InferOutput<typeof pipedInputSchema>;

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
  v.optional(receiverSettingsSchema),
  v.transform((data = {}) => data),
);

async function getInputData(args: unknown[]) {
  // Command line arguments
  const options = v.parse(getConfigSchema, args);

  const { logLevel } = options;
  const output = getOutput({ logLevel });

  // Piped in data stream
  let pipedInputs: PipedInputs;
  try {
    pipedInputs = inputPiped ? await getPipedInputs(process.stdin) : {};
  } catch (error) {
    output.debug(`Failed to read input stream: ${error}`);
    pipedInputs = {};
  }

  return { ...pipedInputs, ...options };
}

async function getPipedInputs(stream: NodeJS.ReadStream): Promise<PipedInputs> {
  const stdinData = await readStream(stream);

  return v.parse(pipedInputSchema, stdinData);
}

const renderingControlArgs = {
  Channel: "Master",
  InstanceID: 0,
} as const;

type ControlConfigs = Pick<
  GetReceiverSettingsFromConfigsArgs,
  | "AudioConfig"
  | "LEDConfig"
  | "LowLatencyConfig"
  | "transcode"
  | "TvConfig"
  | "VolumeLimit"
>;

type GetControlConfigsArgs = { controlClient: ControlClient };

type GetRenderingControlConfigsArgs = {
  renderingControlClient: RenderingControlClient;
};

type RenderingControlConfigs = Pick<
  GetReceiverSettingsFromConfigsArgs,
  "Balance" | "Bass" | "Subwoofer" | "Treble"
>;

async function getControlConfigs({
  controlClient,
}: GetControlConfigsArgs): Promise<ControlConfigs> {
  const audioConfigEnvelope = await controlClient("GetAudioConfig");
  const ledConfigEnvelope = await controlClient("GetLEDConfig");
  const lowLatencyConfigEnvelope = await controlClient("GetLowLatencyConfig");
  const tvConfigEnvelope = await controlClient("GetTvConfig");
  const transcodeEnvelope = await controlClient("GetTranscode");
  const volumeLimitEnvelope = await controlClient("GetVolumeLimit");

  const audioConfigResponse =
    audioConfigEnvelope["s:Envelope"]["s:Body"]["u:GetAudioConfigResponse"];
  const ledConfigResponse =
    ledConfigEnvelope["s:Envelope"]["s:Body"]["u:GetLEDConfigResponse"];
  const lowLatencyConfigResponse =
    lowLatencyConfigEnvelope["s:Envelope"]["s:Body"][
      "u:GetLowLatencyConfigResponse"
    ];
  const tvConfigResponse =
    tvConfigEnvelope["s:Envelope"]["s:Body"]["u:GetTvConfigResponse"];
  const transcodeResponse =
    transcodeEnvelope["s:Envelope"]["s:Body"]["u:GetTranscodeResponse"];
  const volumeLimitResponse =
    volumeLimitEnvelope["s:Envelope"]["s:Body"]["u:GetVolumeLimitResponse"];

  const { AudioConfig } = audioConfigResponse.AudioConfig;
  const { LEDConfig } = ledConfigResponse.LEDConfig;
  const { LowLatencyConfig } = lowLatencyConfigResponse.LowLatencyConfig;
  const { TvConfig } = tvConfigResponse.TvConfig;
  const { transcode } = transcodeResponse;
  const { VolumeLimit } = volumeLimitResponse;

  return {
    AudioConfig,
    LEDConfig,
    LowLatencyConfig,
    transcode,
    TvConfig,
    VolumeLimit,
  };
}

async function getRenderingControlConfigs({
  renderingControlClient,
}: GetRenderingControlConfigsArgs): Promise<RenderingControlConfigs> {
  const subwooferEnvelope = await renderingControlClient(
    "X_GetSubwoofer",
    renderingControlArgs,
  );

  const trebleEnvelope = await renderingControlClient(
    "X_GetTreble",
    renderingControlArgs,
  );

  const balanceEnvelope = await renderingControlClient(
    "X_GetBalance",
    renderingControlArgs,
  );

  const bassEnvelope = await renderingControlClient(
    "X_GetBass",
    renderingControlArgs,
  );

  const subwooferResponse =
    subwooferEnvelope["s:Envelope"]["s:Body"]["u:X_GetSubwooferResponse"];
  const trebleResponse =
    trebleEnvelope["s:Envelope"]["s:Body"]["u:X_GetTrebleResponse"];
  const balanceResponse =
    balanceEnvelope["s:Envelope"]["s:Body"]["u:X_GetBalanceResponse"];
  const bassResponse =
    bassEnvelope["s:Envelope"]["s:Body"]["u:X_GetBassResponse"];

  return {
    Balance: balanceResponse.CurrentBalance,
    Bass: bassResponse.CurrentBass,
    Subwoofer: subwooferResponse.CurrentLevel,
    Treble: trebleResponse.CurrentTreble,
  };
}

export const getConfig = new Command("get-config")
  .description("Reads the current state of the config.")
  .addOption(options.hostname())
  .addOption(options.port().default(defaultActControlPort))
  .addOption(options.actControlUrl().default(defaultActControlUrl))
  .addOption(options.renderingControlUrl().default(defaultRenderingControlUrl))
  .addOption(options.logLevel())
  .action(async (...args: unknown[]) => {
    const inputs = await getInputData(args);
    const {
      actControlUrl = defaultActControlUrl,
      hostname,
      logLevel,
      port = defaultActControlPort,
      renderingControlUrl = defaultRenderingControlUrl,
    } = inputs;

    const output = getOutput({ logLevel });
    output.debug(`get-config input: ${JSON.stringify(inputs, null, 2)}`);

    if (hostname == null) {
      throw new InvalidOptionArgumentError(
        `"hostname" is required. It can be retrieved using the "discover" command and can be piped to the "get-config" command directly as "discover | get-config"`,
      );
    }

    const socket = new Renewable({
      create: () => new net.Socket(),
      destroy: (instance) => instance.destroy(),
    });

    const parser = new XMLParser({ ignoreAttributes: false });
    const builder = new XMLBuilder({ ignoreAttributes: false });

    const clientArgs = {
      build: (data) => builder.build(data),
      host: `${hostname}:${port}`,
      output,
      parse: (data) => parser.parse(data),
      socket: {
        connect: (cb) => socket.current.connect(port, hostname, cb),
        destroy: () => socket.renew(),
        off: (eventName, cb) => socket.current.off(eventName, cb),
        on: (eventName, cb) => socket.current.on(eventName, cb),
        write: (data) => socket.current.write(data),
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
      const controlConfigs = await getControlConfigs({ controlClient });
      const renderingControlConfigs = await getRenderingControlConfigs({
        renderingControlClient,
      });

      const config = getReceiverSettingsFromConfigs({
        ...controlConfigs,
        ...renderingControlConfigs,
        output,
      });

      output.log(JSON.stringify(config, null, 2));
    } finally {
      socket.destroy();
    }
  });
