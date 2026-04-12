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
  defaultAiosControlPort,
  defaultAiosControlPathname,
  inputPiped,
  defaultRenderingControlPathname,
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
  createRenderControlClient,
  type RenderControlClient,
} from "../util/createRenderControlClient";

const getConfigInputSchema = v.tuple([
  v.object({
    hostname: v.optional(v.pipe(v.string(), v.ipv4())),
    port: v.optional(v.number(), defaultAiosControlPort),
    pathname: v.optional(v.string(), defaultAiosControlPathname),
    logLevel: v.picklist(options.logLevels),
  }),
]);

const getConfigSchema = v.pipe(
  getConfigInputSchema,
  v.transform(([options]) => ({ ...options })),
);

const pipedInputSchema = discover.pipedOutputSchema;

const renderControlArgs = {
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

type GetRenderControlConfigsArgs = { renderControlClient: RenderControlClient };

type RenderControlConfigs = Pick<
  GetReceiverSettingsFromConfigsArgs,
  "Subwoofer" | "Treble" | "Balance" | "Bass"
>;

async function getRenderControlConfigs({
  renderControlClient,
}: GetRenderControlConfigsArgs): Promise<RenderControlConfigs> {
  const subwooferEnvelope = await renderControlClient(
    "X_GetSubwoofer",
    renderControlArgs,
  );

  const trebleEnvelope = await renderControlClient(
    "X_GetTreble",
    renderControlArgs,
  );

  const balanceEnvelope = await renderControlClient(
    "X_GetBalance",
    renderControlArgs,
  );

  const bassEnvelope = await renderControlClient(
    "X_GetBass",
    renderControlArgs,
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
  .addOption(options.pathname)
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
      port = pipedInputs.port ?? defaultAiosControlPort,
      pathname = pipedInputs.pathname ?? defaultAiosControlPathname,
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

    const controlClient = createControlClient({
      host: `${hostname}:${port}`,
      pathname,
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
    });

    const renderControlClient = createRenderControlClient({
      host: `${hostname}:${port}`,
      pathname: defaultRenderingControlPathname,
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
    });

    try {
      const controlConfigs = await getControlConfigs({ controlClient });
      const renderControlConfigs = await getRenderControlConfigs({
        renderControlClient,
      });

      const config = getReceiverSettingsFromConfigs({
        ...controlConfigs,
        ...renderControlConfigs,
        output,
      });

      output.log(JSON.stringify(config, null, 2));
    } finally {
      socket.destroy();
    }
  });
