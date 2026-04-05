import { XMLParser } from "fast-xml-parser";
import * as v from "valibot";

import { serializeHeaders } from "./tcp";
import { upnpService } from "../env";
import { IOutput } from "./output";
import * as sockets from "./sockets";
import type { ISocket } from "./sockets";

const primitiveSchema = v.union([
  v.bigint(),
  v.boolean(),
  v.number(),
  v.string(),
]);

type OutputMode = "STEREO"; // or double mono?
type SoundMode = "DIRECT" | "STEREO" | "VIRTUAL";

/** Audio settings for things like filters and sound modes */
export type AudioConfig = {
  highpass: 40 | 80 | 90 | 100 | 110 | 120 | 150 | 200 | 250; // or off?
  lowpass: 40 | 60 | 80 | 90 | 100 | 110 | 120; // can I shut this off?
  subwooferEnable: unknown;
  outputMode: OutputMode;
  ampBridged: unknown;
  soundMode: SoundMode;
  impedance: unknown;
  ampPower: unknown;
  availableSoundModes: "DIRECT,STEREO,VIRTUAL";
  sourceDirect: unknown;
  bassBoost: unknown;
  speakerOption: "NORMAL"; // others?
  toneControlOption: unknown;
  tilt: unknown;
  digitalFilter: "FILTER_1" | "FILTER_2";
  availableDigitalFilter: "FILTER_1,FILTER_2";
  diracHistory: unknown;
};

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

export type TvConfig = {
  input: string;
  connectedInputs: string;
  hdmiVolume: 0 | 1;
  hdmiConnection: "ARC" | "eARC" | unknown;
  remoteVolume: 0 | 1;
  autoPlay: 0 | 1;
  irFlasherFeedback: 0 | 1;
  allowZoning: 0 | 1;
  dialogueEnhance: {
    level: number; // 0-2?
    enabled: 0 | 1;
  };
  nightMode: {
    level: number;
    enabled: 0 | 1;
  };
  audioDelay: number;
  syncMode: "VIDEO" | "AUDIO" | string;
  bilingualMode: "MAIN_VOICE" | "SUB_VOICE" | string;

  /** IR Codes (0 = not learned) */
  irCodeVolPlus: number;
  irCodeVolMinus: number;
  irCodeMute: number;
  irCodeAux: number;
  irCodeLine: number;
  irCodeAnalog: number;
  irCodeAnalog1: number;
  irCodeAnalog2: number;
  irCodeCd: number;
  irCodeRecorder: number;
  irCodeCoaxial: number;
  irCodeOptical: number;
  irCodeOptical1: number;
  irCodeOptical2: number;
  irCodeOptical3: number;
  irCodeHdmi: number;
  irCodeHdmiArc: number;
  irCodeHdmi1: number;
  irCodeHdmi2: number;
  irCodeHdmi3: number;
  irCodeHdmi4: number;
  irCodeQuickSel1: number;
  irCodeQuickSel2: number;
  irCodeQuickSel3: number;
  irCodeQuickSel4: number;
  irCodeQuickSel5: number;
  irCodeQuickSel6: number;
  irCodePowerToggle: number;
  irCodePowerOn: number;
  irCodePowerOff: number;
  irCodeTv: number;
  irCodeBluetooth: number;
  irCodeSubwooferPlus: number;
  irCodeSubwooferMinus: number;
  irCodeBassPlus: number;
  irCodeBassMinus: number;
  irCodeNightMode: number;
  irCodeDialogue: number;
  irCodeSoundMovie: number;
  irCodeSoundMusic: number;
  irCodeSoundPure: number;
  irCodeSoundStereo: number;
  irCodeSoundDirect: number;
  irCodeSoundVirtual: number;
  irCodeDigitalFilter: number;

  dtsDialogControl: {
    level: number;
    enabled: 0 | 1;
    max: number;
  };
  tvRemoteCodes: 0 | 1;
};

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

const LEDConfigSchema = v.object({
  led: v.tuple([
    v.object({ name: v.literal("NETWORK"), brightness: v.number() }),
    v.object({
      name: v.literal("TOUCH"),
      feedbackSoundsEnable: binaryBooleanSchema,
      enable: binaryBooleanSchema,
    }),
  ]),
});

const tvConfigSchema = v.looseObject({
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

const getTvConfigResponseBodySchema = responseBodySchema({
  "u:GetTvConfigResponse": v.object({
    TvConfig: encodedTvConfig,
  }),
});

const getVolumeLimitResponseBodySchema = responseBodySchema({
  "u:GetVolumeLimitResponse": v.object({
    VolumeLimit: v.unknown(),
  }),
});

type ControlRequests = {
  // Audio
  GetAudioConfig: never;
  SetAudioConfig: { AudioConfig: { AudioConfig: Partial<AudioConfig> } };
  GetVolumeLimit: never;
  SetVolumeLimit: { VolumeLimit: number };
  // GetLowLatencyConfig: never;
  // SetLowLatencyConfig: { LowLatencyConfig: Partial<LowLatencyConfig> };

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
  GetVolumeLimit: getVolumeLimitResponseBodySchema,
  SetVolumeLimit: v.unknown(),
  // GetLowLatencyConfig: unknown;
  // SetLowLatencyConfig: unknown;

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
