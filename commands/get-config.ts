import net from "net";
import * as v from "valibot";
import { Command, InvalidOptionArgumentError } from "commander";
import { XMLParser } from "fast-xml-parser";
import XMLBuilder from "fast-xml-builder";

import {
  createControlClient,
  type ControlClient,
} from "../util/createControlClient";
import {
  defaultActControlPort,
  defaultActControlUrl,
  inputPiped,
  defaultRenderingControlUrl,
} from "../env";
import { read as readStream } from "../util/streams";
import { getOutput } from "../util/output";
import * as discover from "./discover";
import * as options from "../util/options";
import { Renewable } from "../util/Renewable";
import {
  getReceiverSettingsFromConfigs,
  type GetReceiverSettingsFromConfigsArgs,
} from "../util/getReceiverSettingsFromConfigs";
import {
  createRenderingControlClient,
  type RenderingControlClient,
} from "../util/createRenderingControlClient";
import type { CreateClientArgs } from "../util/createEndpoint";

const getConfigInputSchema = v.tuple([
  v.object({
    hostname: v.optional(v.pipe(v.string(), v.ipv4())),
    port: v.optional(v.number(), defaultActControlPort),
    actControlUrl: v.optional(v.string(), defaultActControlUrl),
    renderingControlUrl: v.optional(v.string(), defaultRenderingControlUrl),
    logLevel: v.picklist(options.logLevels),
  }),
]);

const getConfigSchema = v.pipe(
  getConfigInputSchema,
  v.transform(([options]) => ({ ...options })),
);

const pipedInputSchema = discover.pipedOutputSchema;

const renderingControlArgs = {
  InstanceID: 0,
  Channel: "Master",
} as const;

type GetControlConfigsArgs = { controlClient: ControlClient };

type ControlConfigs = Pick<
  GetReceiverSettingsFromConfigsArgs,
  | "AudioConfig"
  | "LEDConfig"
  | "LowLatencyConfig"
  | "TvConfig"
  | "VolumeLimit"
  | "transcode"
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
    TvConfig,
    transcode,
    VolumeLimit,
  };
}

type GetRenderingControlConfigsArgs = {
  renderingControlClient: RenderingControlClient;
};

type RenderingControlConfigs = Pick<
  GetReceiverSettingsFromConfigsArgs,
  "Subwoofer" | "Treble" | "Balance" | "Bass"
>;

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
    Subwoofer: subwooferResponse.CurrentLevel,
    Treble: trebleResponse.CurrentTreble,
    Balance: balanceResponse.CurrentBalance,
    Bass: bassResponse.CurrentBass,
  };
}

export const getConfig = new Command("get-config")
  .description("Reads the current state of the config.")
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
      logLevel,
      hostname = pipedInputs.hostname,
      port = pipedInputs.port ?? defaultActControlPort,
      actControlUrl = pipedInputs.actControlUrl ?? defaultActControlUrl,
      renderingControlUrl = pipedInputs.renderingControlUrl ??
        defaultRenderingControlUrl,
    } = v.parse(getConfigSchema, args);

    if (hostname == null) {
      throw new InvalidOptionArgumentError(
        `"hostname" is required. It can be retrieved using the "discover" command and can be piped to the "get-config" command directly as "discover | get-config"`,
      );
    }

    const output = getOutput({ logLevel });

    const socket = new Renewable({
      create: () => new net.Socket(),
      destroy: (instance) => instance.destroy(),
    });

    const parser = new XMLParser({ ignoreAttributes: false });
    const builder = new XMLBuilder({ ignoreAttributes: false });

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
