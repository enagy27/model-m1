import { XMLParser } from "fast-xml-parser";
import * as v from "valibot";

import { upnpService } from "../env";
import type { IOutput } from "./output";
import * as sockets from "./sockets";
import type { ISocket } from "./sockets";

const primitiveSchema = v.union([
  v.bigint(),
  v.boolean(),
  v.number(),
  v.string(),
]);

export type NetworkLEDConfig = {
  name: "NETWORK";
  brightness: number; /* 0-100 */
};

export type TouchLEDConfig = {
  name: "TOUCH";
  feedbackSoundsEnable: 0 | 1;
  enable: 0 | 1;
};

type IndividualLEDConfig = NetworkLEDConfig | TouchLEDConfig;

/** Controls LEDs on the front of the device showing network status and touch response */
export type LEDConfig = { led: IndividualLEDConfig[] };

const binaryBooleanSchema = v.picklist([0, 1]);

const csvList = v.pipe(
  v.string(),
  v.transform((values) => values.split(",")),
);

const audioConfigSchema = v.object({
  highpass: v.number(),
  lowpass: v.number(),
  subwooferEnable: binaryBooleanSchema,
  outputMode: v.string(),
  ampBridged: binaryBooleanSchema,
  soundMode: v.string(),
  availableSoundModes: csvList,
  sourceDirect: binaryBooleanSchema,
  bassBoost: v.number(),
  speakerOption: v.string(),
  toneControlOption: v.unknown(),
  tilt: v.number(),
  digitalFilter: v.string(),
  availableDigitalFilter: csvList,
  diracHistory: binaryBooleanSchema,
  diracFilterList: v.optional(
    v.object({
      filter1: v.optional(v.string()),
      filter2: v.optional(v.string()),
      filter3: v.optional(v.string()),
    }),
  ),
  diracActiveFilter: v.optional(v.string()),
});

export type AudioConfig = v.InferOutput<typeof audioConfigSchema>;

const LEDConfigSchema = v.object({
  led: v.array(
    v.union([
      v.object({ name: v.literal("NETWORK"), brightness: v.number() }),
      v.object({
        name: v.literal("TOUCH"),
        feedbackSoundsEnable: binaryBooleanSchema,
        enable: binaryBooleanSchema,
      }),
    ]),
  ),
});

const tvConfigSchema = v.object({
  input: v.string(),
  connectedInputs: v.string(),
  hdmiVolume: v.number(),
  hdmiConnection: v.string(),
  remoteVolume: v.number(),
  autoPlay: binaryBooleanSchema,
  irFlasherFeedback: binaryBooleanSchema,
  allowZoning: binaryBooleanSchema,
  dialogueEnhance: v.object({
    level: v.number(),
    enabled: binaryBooleanSchema,
  }),
  nightMode: v.object({
    level: v.number(),
    enabled: binaryBooleanSchema,
  }),
  audioDelay: v.number(),
  syncMode: v.string(),
  bilingualMode: v.string(),
  irCodeVolPlus: v.number(),
  irCodeVolMinus: v.number(),
  irCodeMute: v.number(),
  irCodeAux: v.number(),
  irCodeLine: v.number(),
  irCodeAnalog: v.number(),
  irCodeAnalog1: v.number(),
  irCodeAnalog2: v.number(),
  irCodeCd: v.number(),
  irCodeRecorder: v.number(),
  irCodeCoaxial: v.number(),
  irCodeOptical: v.number(),
  irCodeOptical1: v.number(),
  irCodeOptical2: v.number(),
  irCodeOptical3: v.number(),
  irCodeHdmi: v.number(),
  irCodeHdmiArc: v.number(),
  irCodeHdmi1: v.number(),
  irCodeHdmi2: v.number(),
  irCodeHdmi3: v.number(),
  irCodeHdmi4: v.number(),
  irCodeQuickSel1: v.number(),
  irCodeQuickSel2: v.number(),
  irCodeQuickSel3: v.number(),
  irCodeQuickSel4: v.number(),
  irCodeQuickSel5: v.number(),
  irCodeQuickSel6: v.number(),
  irCodePowerToggle: v.number(),
  irCodePowerOn: v.number(),
  irCodePowerOff: v.number(),
  irCodeTv: v.number(),
  irCodeBluetooth: v.number(),
  irCodeSubwooferPlus: v.number(),
  irCodeSubwooferMinus: v.number(),
  irCodeBassPlus: v.number(),
  irCodeBassMinus: v.number(),
  irCodeNightMode: v.number(),
  irCodeDialogue: v.number(),
  irCodeSoundMovie: v.number(),
  irCodeSoundMusic: v.number(),
  irCodeSoundPure: v.number(),
  irCodeSoundStereo: v.number(),
  irCodeSoundDirect: v.number(),
  irCodeSoundVirtual: v.number(),
  irCodeDigitalFilter: v.number(),
  dtsDialogControl: v.object({
    level: v.number(),
    enabled: binaryBooleanSchema,
    max: v.number(),
  }),
  tvRemoteCodes: binaryBooleanSchema,
});

export type TvConfig = v.InferOutput<typeof tvConfigSchema>;

const lowLatencyConfigSchema = v.object({
  enabled: binaryBooleanSchema,
  delay: v.number(),
});

export type LowLatencyConfig = v.InferOutput<typeof lowLatencyConfigSchema>;

function responseBodySchema<T extends v.ObjectEntries>(entries: T) {
  return v.object({
    "s:Envelope": v.object({
      "s:Body": v.object(entries),
    }),
  });
}

const parser = new XMLParser({ ignoreAttributes: false });
const decodeXml = (data: string) => parser.parse(data);

const encodedAudioConfig = v.pipe(
  v.string(),
  v.transform(decodeXml),
  v.object({ AudioConfig: audioConfigSchema }),
);

const encodedLEDConfig = v.pipe(
  v.string(),
  v.transform(decodeXml),
  v.object({ LEDConfig: LEDConfigSchema }),
);

const encodedTvConfig = v.pipe(
  v.string(),
  v.transform(decodeXml),
  v.object({ TvConfig: tvConfigSchema }),
);

const encodedLowLatencyConfig = v.pipe(
  v.string(),
  v.transform(decodeXml),
  v.object({ LowLatencyConfig: lowLatencyConfigSchema }),
);

const getAudioConfigResponseBodySchema = responseBodySchema({
  "u:GetAudioConfigResponse": v.object({
    AudioConfig: encodedAudioConfig,
  }),
});

const getLEDConfigResponseBodySchema = responseBodySchema({
  "u:GetLEDConfigResponse": v.object({
    LEDConfig: encodedLEDConfig,
  }),
});

const getLowLatencyConfigResponseBodySchema = responseBodySchema({
  "u:GetLowLatencyConfigResponse": v.object({
    LowLatencyConfig: encodedLowLatencyConfig,
  }),
});

const getTranscodeResponseBodySchema = responseBodySchema({
  "u:GetTranscodeResponse": v.object({
    transcode: binaryBooleanSchema,
  }),
});

const getTvConfigResponseBodySchema = responseBodySchema({
  "u:GetTvConfigResponse": v.object({
    TvConfig: encodedTvConfig,
  }),
});

const getVolumeLimitResponseBodySchema = responseBodySchema({
  "u:GetVolumeLimitResponse": v.object({
    VolumeLimit: v.number(),
  }),
});

type ControlRequests = {
  // Audio
  GetAudioConfig: never;
  SetAudioConfig: { AudioConfig: { AudioConfig: Partial<AudioConfig> } };
  GetLowLatencyConfig: never;
  SetLowLatencyConfig: { LowLatencyConfig: Partial<LowLatencyConfig> };
  GetTranscode: never;
  SetTranscode: { transcode: number };
  GetVolumeLimit: never;
  SetVolumeLimit: { VolumeLimit: number };

  // Device Settings
  GetLEDConfig: never;
  SetLEDConfig: { LEDConfig: { LEDConfig: Partial<LEDConfig> } };

  // TV Config
  GetTvConfig: never;
  SetTvConfig: { TvConfig: Partial<TvConfig> };
};

const controlResponseSchemas = {
  // Audio
  GetAudioConfig: getAudioConfigResponseBodySchema,
  SetAudioConfig: v.unknown(),
  GetLowLatencyConfig: getLowLatencyConfigResponseBodySchema,
  SetLowLatencyConfig: v.unknown(),
  GetTranscode: getTranscodeResponseBodySchema,
  SetTranscode: v.unknown(),
  GetVolumeLimit: getVolumeLimitResponseBodySchema,
  SetVolumeLimit: v.unknown(),

  // Device Settings
  GetLEDConfig: getLEDConfigResponseBodySchema,
  SetLEDConfig: v.unknown(),

  // TV Config
  GetTvConfig: getTvConfigResponseBodySchema,
  SetTvConfig: v.unknown(),
};

type ControlRequestArgs<K extends keyof ControlRequests> =
  ControlRequests[K] extends never ? [K] : [K, ControlRequests[K]];

export type ControlArgs = {
  readonly socket: ISocket;
  readonly host: string;
  readonly pathname: string;
  readonly output: IOutput;
  parse(this: void, data: string): unknown;
  build(this: void, data: unknown): string;
};

export function control({
  socket,
  output,
  host,
  pathname,
  build,
  parse,
}: ControlArgs) {
  function createBody<K extends keyof ControlRequests>(
    action: K,
    data: ControlRequests[K] | {},
  ): string {
    const actionArgs = Object.fromEntries(
      Object.entries(data).map(([argName, value]: [string, unknown]) => {
        if (v.is(primitiveSchema, value)) {
          return [argName, value] as const;
        }

        return [argName, build(value)] as const;
      }),
    );

    const body = {
      "s:Envelope": {
        "@_xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
        "@_s:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/",

        "s:Body": {
          [`u:${action}`]: {
            "@_xmlns:u": upnpService,

            ...actionArgs,
          },
        },
      },
    };

    // Include the CRLF so that it is calculated as part of the CONTENT-LENGTH
    return `${build(body)}\r\n`;
  }

  return async function controlRequest<K extends keyof ControlRequests>(
    ...args: ControlRequestArgs<K>
  ) {
    const [action, data = {}] = args;

    output.debug(
      `control: invoking action="${action}" with data: ${JSON.stringify(data, null, 2)}`,
    );

    const body = createBody(action, data);

    const contentLength = Buffer.byteLength(body);
    const headers = {
      HOST: host,
      "CONTENT-LENGTH": `${contentLength}`,
      "ACCEPT-RANGES": "bytes",
      "CONTENT-TYPE": `text/xml; charset="utf-8"`,
      SOAPACTION: `"${upnpService}#${action}"`,
      "USER-AGENT": `marantz-model-m1-remote/1.0.0`,
    };

    const response = await sockets.request({
      socket,
      output,
      method: "POST",
      pathname,
      headers,
      body,
    });

    const xml = response.body ? parse(response.body) : undefined;

    return v.parse(controlResponseSchemas[action], xml);
  };
}

export type ControlInstance = ReturnType<typeof control>;
