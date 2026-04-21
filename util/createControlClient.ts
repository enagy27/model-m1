import { XMLParser } from "fast-xml-parser";
import * as v from "valibot";

import { upnpService } from "#env.js";

import { createEndpoint } from "./createEndpoint.js";

/** Controls LEDs on the front of the device showing network status and touch response */
export type LEDConfig = { led: IndividualLEDConfig[] };

export type NetworkLEDConfig = {
  brightness: number; /* 0-100 */
  name: "NETWORK";
};

export type TouchLEDConfig = {
  enable: 0 | 1;
  feedbackSoundsEnable: 0 | 1;
  name: "TOUCH";
};

type IndividualLEDConfig = NetworkLEDConfig | TouchLEDConfig;

const binaryBooleanSchema = v.picklist([0, 1]);

const csvList = v.pipe(
  v.string(),
  v.transform((values) => values.split(",")),
);

const audioConfigSchema = v.object({
  ampBridged: binaryBooleanSchema,
  availableDigitalFilter: csvList,
  availableSoundModes: csvList,
  bassBoost: v.number(),
  digitalFilter: v.string(),
  diracActiveFilter: v.optional(v.string()),
  diracFilterList: v.optional(
    v.object({
      filter1: v.optional(v.string()),
      filter2: v.optional(v.string()),
      filter3: v.optional(v.string()),
    }),
  ),
  diracHistory: binaryBooleanSchema,
  highpass: v.number(),
  lowpass: v.number(),
  outputMode: v.string(),
  soundMode: v.string(),
  sourceDirect: binaryBooleanSchema,
  speakerOption: v.string(),
  subwooferEnable: binaryBooleanSchema,
  tilt: v.number(),
  toneControlOption: v.unknown(),
});

export type AudioConfig = v.InferOutput<typeof audioConfigSchema>;

const LEDConfigSchema = v.object({
  led: v.array(
    v.union([
      v.object({ brightness: v.number(), name: v.literal("NETWORK") }),
      v.object({
        enable: binaryBooleanSchema,
        feedbackSoundsEnable: binaryBooleanSchema,
        name: v.literal("TOUCH"),
      }),
    ]),
  ),
});

const tvConfigSchema = v.object({
  allowZoning: binaryBooleanSchema,
  audioDelay: v.number(),
  autoPlay: binaryBooleanSchema,
  bilingualMode: v.string(),
  connectedInputs: v.string(),
  dialogueEnhance: v.object({
    enabled: binaryBooleanSchema,
    level: v.number(),
  }),
  dtsDialogControl: v.object({
    enabled: binaryBooleanSchema,
    level: v.number(),
    max: v.number(),
  }),
  hdmiConnection: v.string(),
  hdmiVolume: v.number(),
  input: v.string(),
  irCodeAnalog: v.number(),
  irCodeAnalog1: v.number(),
  irCodeAnalog2: v.number(),
  irCodeAux: v.number(),
  irCodeBassMinus: v.number(),
  irCodeBassPlus: v.number(),
  irCodeBluetooth: v.number(),
  irCodeCd: v.number(),
  irCodeCoaxial: v.number(),
  irCodeDialogue: v.number(),
  irCodeDigitalFilter: v.number(),
  irCodeHdmi: v.number(),
  irCodeHdmi1: v.number(),
  irCodeHdmi2: v.number(),
  irCodeHdmi3: v.number(),
  irCodeHdmi4: v.number(),
  irCodeHdmiArc: v.number(),
  irCodeLine: v.number(),
  irCodeMute: v.number(),
  irCodeNightMode: v.number(),
  irCodeOptical: v.number(),
  irCodeOptical1: v.number(),
  irCodeOptical2: v.number(),
  irCodeOptical3: v.number(),
  irCodePowerOff: v.number(),
  irCodePowerOn: v.number(),
  irCodePowerToggle: v.number(),
  irCodeQuickSel1: v.number(),
  irCodeQuickSel2: v.number(),
  irCodeQuickSel3: v.number(),
  irCodeQuickSel4: v.number(),
  irCodeQuickSel5: v.number(),
  irCodeQuickSel6: v.number(),
  irCodeRecorder: v.number(),
  irCodeSoundDirect: v.number(),
  irCodeSoundMovie: v.number(),
  irCodeSoundMusic: v.number(),
  irCodeSoundPure: v.number(),
  irCodeSoundStereo: v.number(),
  irCodeSoundVirtual: v.number(),
  irCodeSubwooferMinus: v.number(),
  irCodeSubwooferPlus: v.number(),
  irCodeTv: v.number(),
  irCodeVolMinus: v.number(),
  irCodeVolPlus: v.number(),
  irFlasherFeedback: binaryBooleanSchema,
  nightMode: v.object({
    enabled: binaryBooleanSchema,
    level: v.number(),
  }),
  remoteVolume: v.number(),
  syncMode: v.string(),
  tvRemoteCodes: binaryBooleanSchema,
});

export type TvConfig = v.InferOutput<typeof tvConfigSchema>;

const lowLatencyConfigSchema = v.object({
  delay: v.number(),
  enabled: binaryBooleanSchema,
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
  // Device Settings
  GetLEDConfig: never;
  GetLowLatencyConfig: never;
  GetTranscode: never;
  // TV Config
  GetTvConfig: never;
  GetVolumeLimit: never;
  SetAudioConfig: { AudioConfig: { AudioConfig: Partial<AudioConfig> } };
  SetLEDConfig: { LEDConfig: { LEDConfig: Partial<LEDConfig> } };

  SetLowLatencyConfig: {
    LowLatencyConfig: { LowLatencyConfig: Partial<LowLatencyConfig> };
  };
  SetTranscode: { transcode: number };

  SetTvConfig: { TvConfig: { TvConfig: Partial<TvConfig> } };
  SetVolumeLimit: { VolumeLimit: number };
};

const controlResponseSchemas = {
  // Audio
  GetAudioConfig: getAudioConfigResponseBodySchema,
  // Device Settings
  GetLEDConfig: getLEDConfigResponseBodySchema,
  GetLowLatencyConfig: getLowLatencyConfigResponseBodySchema,
  GetTranscode: getTranscodeResponseBodySchema,
  // TV Config
  GetTvConfig: getTvConfigResponseBodySchema,
  GetVolumeLimit: getVolumeLimitResponseBodySchema,
  SetAudioConfig: v.unknown(),
  SetLEDConfig: v.unknown(),

  SetLowLatencyConfig: v.unknown(),
  SetTranscode: v.unknown(),

  SetTvConfig: v.unknown(),
  SetVolumeLimit: v.unknown(),
};

const controlResponses = {
  // Audio
  GetAudioConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetAudioConfig, body),
  // Device Settings
  GetLEDConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetLEDConfig, body),
  GetLowLatencyConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetLowLatencyConfig, body),
  GetTranscode: (body: unknown) =>
    v.parse(controlResponseSchemas.GetTranscode, body),
  // TV Config
  GetTvConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetTvConfig, body),
  GetVolumeLimit: (body: unknown) =>
    v.parse(controlResponseSchemas.GetVolumeLimit, body),
  SetAudioConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetAudioConfig, body),
  SetLEDConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetLEDConfig, body),

  SetLowLatencyConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetLowLatencyConfig, body),
  SetTranscode: (body: unknown) =>
    v.parse(controlResponseSchemas.SetTranscode, body),

  SetTvConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetTvConfig, body),
  SetVolumeLimit: (body: unknown) =>
    v.parse(controlResponseSchemas.SetVolumeLimit, body),
};

export const createControlClient = createEndpoint<
  ControlRequests,
  typeof controlResponses
>({
  responses: controlResponses,
  service: upnpService,
});

export type ControlClient = ReturnType<typeof createControlClient>;
