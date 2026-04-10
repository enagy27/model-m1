import { XMLParser } from "fast-xml-parser";
import * as v from "valibot";

import { upnpService } from "../env";
import { createEndpoint } from "./createEndpoint";

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

const controlResponses = {
  // Audio
  GetAudioConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetAudioConfig, body),
  SetAudioConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetAudioConfig, body),
  GetLowLatencyConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetLowLatencyConfig, body),
  SetLowLatencyConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetLowLatencyConfig, body),
  GetTranscode: (body: unknown) =>
    v.parse(controlResponseSchemas.GetTranscode, body),
  SetTranscode: (body: unknown) =>
    v.parse(controlResponseSchemas.SetTranscode, body),
  GetVolumeLimit: (body: unknown) =>
    v.parse(controlResponseSchemas.GetVolumeLimit, body),
  SetVolumeLimit: (body: unknown) =>
    v.parse(controlResponseSchemas.SetVolumeLimit, body),

  // Device Settings
  GetLEDConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetLEDConfig, body),
  SetLEDConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetLEDConfig, body),

  // TV Config
  GetTvConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.GetTvConfig, body),
  SetTvConfig: (body: unknown) =>
    v.parse(controlResponseSchemas.SetTvConfig, body),
};

export const createControlClient = createEndpoint<
  ControlRequests,
  typeof controlResponses
>({
  service: upnpService,
  responses: controlResponses,
});

export type ControlClient = ReturnType<typeof createControlClient>;
