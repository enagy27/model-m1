import type {
  AudioConfig,
  LEDConfig,
  LowLatencyConfig,
  TouchLEDConfig,
  TvConfig,
} from "./createControlClient.js";
import type { IOutput } from "./output.js";
import type { ReceiverSettings } from "./receiverSettings.js";

export type GetReceiverSettingsFromConfigsArgs = {
  AudioConfig: Pick<
    AudioConfig,
    | "digitalFilter"
    | "diracActiveFilter"
    | "highpass"
    | "lowpass"
    | "outputMode"
    | "soundMode"
  >;
  Balance: number;
  Bass: number;
  LEDConfig: LEDConfig;
  LowLatencyConfig: LowLatencyConfig;
  output: IOutput;
  Subwoofer: number;
  transcode: 0 | 1;
  Treble: number;
  TvConfig: Pick<
    TvConfig,
    "autoPlay" | "dialogueEnhance" | "input" | "nightMode" | "tvRemoteCodes"
  >;
  VolumeLimit: number;
};

type ReceiverSettingsResponse = Omit<
  ReceiverSettings,
  keyof ReceiverSettingsResponseOverrides
> &
  ReceiverSettingsResponseOverrides;

type ReceiverSettingsResponseOverrides = {
  digitalFilter?: string;
  highPassFilter?: "off" | number;
  lowPassFilter?: number;
};

export function getReceiverSettingsFromConfigs({
  AudioConfig,
  Balance,
  Bass,
  LEDConfig,
  LowLatencyConfig,
  output,
  Subwoofer,
  transcode,
  Treble,
  TvConfig,
  VolumeLimit,
}: GetReceiverSettingsFromConfigsArgs): ReceiverSettingsResponse {
  const soundMode = getSoundMode(AudioConfig.soundMode);
  if (soundMode == null) {
    output.debug(`unknown soundMode: ${soundMode}`);
  }

  const dialogueEnhancement = getDialogueEnhancement(TvConfig.dialogueEnhance);
  if (dialogueEnhancement == null) {
    output.debug(`unknown dialogueEnhance: ${TvConfig.dialogueEnhance}`);
  }

  const nightMode = getNightMode(TvConfig.nightMode);

  const { led } = LEDConfig;
  const networkLED = led.find((diode) => diode.name === "NETWORK");
  const touchLED = led.find((diode) => diode.name === "TOUCH");

  return {
    audioDelay: LowLatencyConfig.enabled ? LowLatencyConfig.delay : 0,
    balance: Balance - 20,
    bass: Bass - 5,
    dialogueEnhancement,
    digitalFilter: getDigitalFilter(AudioConfig.digitalFilter),
    diracLiveFilter: getDiracLiveFilter(AudioConfig.diracActiveFilter),
    highPassFilter: AudioConfig.highpass || "off",
    lowPassFilter: AudioConfig.lowpass,
    multiRoomAudioQuality: transcode ? "normal" : "high",
    nightMode,
    outputMode: getOutputMode(AudioConfig.outputMode),
    soundMode,
    statusLedBrightness: networkLED?.brightness,
    subwoofer: Subwoofer - 15,
    touchControls: touchLED ? getTouchControls(touchLED) : undefined,
    treble: Treble - 5,
    tvAutoplay: TvConfig.autoPlay ? "on" : "off",
    tvInput: getTvInput(TvConfig.input),
    tvRemoteCodes: TvConfig.tvRemoteCodes ? "on" : "off",
    // energyMode? may not be working in the app?
    volumeLimit: VolumeLimit,
  };
}

function getDialogueEnhancement({
  enabled,
  level,
}: TvConfig["dialogueEnhance"]): ReceiverSettings["dialogueEnhancement"] {
  if (!enabled) {
    return "off";
  }

  switch (level) {
    case 0: {
      return "off";
    }

    case 1: {
      return "low";
    }

    case 2: {
      return "medium";
    }

    case 3: {
      return "high";
    }

    default: {
      return undefined;
    }
  }
}

function getDigitalFilter(
  digitalFilter: AudioConfig["digitalFilter"],
): ReceiverSettings["digitalFilter"] {
  switch (digitalFilter) {
    case "FILTER_1": {
      return "filter1";
    }

    case "FILTER_2": {
      return "filter2";
    }

    default: {
      return undefined;
    }
  }
}

function getDiracLiveFilter(
  diracActiveFilter: AudioConfig["diracActiveFilter"],
): ReceiverSettings["diracLiveFilter"] {
  switch (diracActiveFilter) {
    case "filter1":
    case "filter2":
    case "filter3":
    case "off": {
      return diracActiveFilter;
    }

    default: {
      return undefined;
    }
  }
}

function getNightMode({
  enabled,
  level,
}: TvConfig["nightMode"]): NonNullable<ReceiverSettings["nightMode"]> {
  if (!enabled) {
    return "off";
  }

  return level ? "on" : "off";
}

function getOutputMode(outputMode: string): ReceiverSettings["outputMode"] {
  switch (outputMode) {
    case "STEREO": {
      return "stereo";
    }

    default: {
      return undefined;
    }
  }
}

function getSoundMode(
  soundMode: AudioConfig["soundMode"],
): ReceiverSettings["soundMode"] {
  switch (soundMode.toLowerCase()) {
    case "direct": {
      return "direct";
    }

    case "stereo": {
      return "stereo";
    }

    case "virtual": {
      return "virtual";
    }

    default: {
      return undefined;
    }
  }
}

function getTouchControls({
  enable,
  feedbackSoundsEnable,
}: TouchLEDConfig): NonNullable<ReceiverSettings["touchControls"]> {
  if (!enable) {
    return "off";
  }

  return feedbackSoundsEnable ? "onWithSound" : "on";
}

function getTvInput(input: TvConfig["input"]): ReceiverSettings["tvInput"] {
  // expecting: OPTICAL, HDMI-ARC, ANY, NONE
  switch (input.toLowerCase()) {
    case "any": {
      return "auto";
    }

    case "hdmi-arc": {
      return "hdmi";
    }

    case "none": {
      return "none";
    }

    case "optical": {
      return "optical";
    }

    default: {
      return undefined;
    }
  }
}
