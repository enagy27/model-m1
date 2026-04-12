import type {
  AudioConfig,
  LEDConfig,
  LowLatencyConfig,
  TouchLEDConfig,
  TvConfig,
} from "./createControlClient";
import type { IOutput } from "./output";
import type { ReceiverSettings } from "./receiverSettings";

type ReceiverSettingsResponseOverrides = {
  lowPassFilter?: number;
  highPassFilter?: number | "off";
  digitalFilter?: string;
};

type ReceiverSettingsResponse = Omit<
  ReceiverSettings,
  keyof ReceiverSettingsResponseOverrides
> &
  ReceiverSettingsResponseOverrides;

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
  LEDConfig: LEDConfig;
  LowLatencyConfig: LowLatencyConfig;
  TvConfig: Pick<
    TvConfig,
    "autoPlay" | "dialogueEnhance" | "input" | "nightMode" | "tvRemoteCodes"
  >;
  transcode: 0 | 1;
  VolumeLimit: number;
  Bass: number;
  Treble: number;
  Balance: number;
  Subwoofer: number;
  output: IOutput;
};

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

function getDialogEnhancement({
  enabled,
  level,
}: TvConfig["dialogueEnhance"]): ReceiverSettings["dialogEnhancement"] {
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

function getNightMode({
  enabled,
  level,
}: TvConfig["nightMode"]): NonNullable<ReceiverSettings["nightMode"]> {
  if (!enabled) {
    return "off";
  }

  return level ? "on" : "off";
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
    case "off":
    case "filter1":
    case "filter2":
    case "filter3": {
      return diracActiveFilter;
    }

    default: {
      return undefined;
    }
  }
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

function getTvInput(input: TvConfig["input"]): ReceiverSettings["tvInput"] {
  // expecting: OPTICAL, HDMI-ARC, ANY, NONE
  switch (input.toLowerCase()) {
    case "any": {
      return "auto";
    }

    case "hdmi-arc": {
      return "hdmi";
    }

    case "optical": {
      return "optical";
    }

    case "none": {
      return "none";
    }

    default: {
      return undefined;
    }
  }
}

export function getReceiverSettingsFromConfigs({
  AudioConfig,
  LEDConfig,
  LowLatencyConfig,
  TvConfig,
  transcode,
  VolumeLimit,
  Bass,
  Treble,
  Balance,
  Subwoofer,
  output,
}: GetReceiverSettingsFromConfigsArgs): ReceiverSettingsResponse {
  const soundMode = getSoundMode(AudioConfig.soundMode);
  if (soundMode == null) {
    output.debug(`unknown soundMode: ${soundMode}`);
  }

  const dialogEnhancement = getDialogEnhancement(TvConfig.dialogueEnhance);
  if (dialogEnhancement == null) {
    output.debug(`unknown dialogEnhance: ${TvConfig.dialogueEnhance}`);
  }

  const nightMode = getNightMode(TvConfig.nightMode);

  const { led } = LEDConfig;
  const networkLED = led.find((diode) => diode.name === "NETWORK");
  const touchLED = led.find((diode) => diode.name === "TOUCH");

  return {
    soundMode,
    dialogEnhancement,
    nightMode,
    bass: Bass - 5,
    treble: Treble - 5,
    balance: Balance - 20,
    subwoofer: Subwoofer - 15,
    multiRoomAudioQuality: transcode ? "normal" : "high",
    statusLedBrightness: networkLED?.brightness,
    // energyMode? may not be working in the app?
    volumeLimit: VolumeLimit,
    touchControls: touchLED ? getTouchControls(touchLED) : undefined,
    lowPassFilter: AudioConfig.lowpass,
    digitalFilter: getDigitalFilter(AudioConfig.digitalFilter),
    diracLiveFilter: getDiracLiveFilter(AudioConfig.diracActiveFilter),
    outputMode: getOutputMode(AudioConfig.outputMode),
    highPassFilter: AudioConfig.highpass || "off",
    tvInput: getTvInput(TvConfig.input),
    tvAutoplay: TvConfig.autoPlay ? "on" : "off",
    tvRemoteCodes: TvConfig.tvRemoteCodes ? "on" : "off",
    audioDelay: LowLatencyConfig.enabled ? LowLatencyConfig.delay : 0,
  };
}
