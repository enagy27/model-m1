import type {
  AudioConfig,
  LEDConfig,
  LowLatencyConfig,
  NetworkLEDConfig,
  TouchLEDConfig,
  TvConfig,
} from "./createControlClient.js";

import {
  isEmptyObject,
  type NonNullishValues,
  removeNullishValueEntries,
} from "./object.js";
import { type ReceiverSettings } from "./receiverSettings.js";

export type ConfigsFromReceiverSettings = {
  AudioConfig: Partial<AudioConfig> | undefined;
  Balance: number | undefined;
  Bass: number | undefined;
  LEDConfig: Partial<LEDConfig> | undefined;
  LowLatencyConfig: LowLatencyConfig | undefined;
  Subwoofer: number | undefined;
  transcode: 0 | 1 | undefined;
  Treble: number | undefined;
  TvConfig: Partial<TvConfig> | undefined;
  VolumeLimit: number | undefined;
};

type AudioConfigReceiverSettings = Pick<
  ReceiverSettings,
  | "digitalFilter"
  | "diracLiveFilter"
  | "highPassFilter"
  | "lowPassFilter"
  | "outputMode"
  | "soundMode"
>;

type LEDConfigReceiverSettings = Pick<
  ReceiverSettings,
  "statusLedBrightness" | "touchControls"
>;

type LowLatencyConfigReceiverSettings = Pick<ReceiverSettings, "audioDelay">;

type TvConfigReceiverSettings = Pick<
  ReceiverSettings,
  | "audioDelay"
  | "dialogueEnhancement"
  | "nightMode"
  | "tvAutoplay"
  | "tvInput"
  | "tvRemoteCodes"
>;

/**
 * Transforms user-facing settings to the internal command language
 * of the device.
 */
export function getConfigsFromReceiverSettings({
  audioDelay,
  balance,
  bass,
  dialogueEnhancement,
  digitalFilter,
  diracLiveFilter,
  highPassFilter,
  lowPassFilter,
  multiRoomAudioQuality,
  nightMode,
  outputMode,
  soundMode,
  statusLedBrightness,
  subwoofer,
  touchControls,
  treble,
  tvAutoplay,
  tvInput,
  tvRemoteCodes,
  volumeLimit: VolumeLimit,
}: ReceiverSettings): ConfigsFromReceiverSettings {
  const LEDConfig = getLEDConfig({ statusLedBrightness, touchControls });
  const LowLatencyConfig = getLowLatencyConfig({ audioDelay });

  return {
    AudioConfig: minifyConfig(
      getAudioConfig({
        digitalFilter,
        diracLiveFilter,
        highPassFilter,
        lowPassFilter,
        outputMode,
        soundMode,
      }),
    ),

    Balance: balance != null ? balance + 20 : undefined,

    Bass: bass != null ? bass + 5 : undefined,

    LEDConfig: LEDConfig != null ? minifyConfig(LEDConfig) : undefined,

    LowLatencyConfig:
      LowLatencyConfig != null ? minifyConfig(LowLatencyConfig) : undefined,

    Subwoofer: subwoofer != null ? subwoofer + 15 : undefined,

    transcode:
      multiRoomAudioQuality != null
        ? getTranscode(multiRoomAudioQuality)
        : undefined,
    Treble: treble != null ? treble + 5 : undefined,
    TvConfig: minifyConfig(
      getTvConfig({
        dialogueEnhancement,
        nightMode,
        tvAutoplay,
        tvInput,
        tvRemoteCodes,
      }),
    ),
    VolumeLimit,
  };
}

function Binary(value: boolean) {
  return value ? 1 : 0;
}

function getAudioConfig({
  digitalFilter,
  diracLiveFilter,
  highPassFilter,
  lowPassFilter,
  outputMode,
  soundMode,
}: AudioConfigReceiverSettings): Partial<AudioConfig> {
  return {
    digitalFilter:
      digitalFilter != null ? getDigitalFilterValue(digitalFilter) : undefined,
    diracActiveFilter: diracLiveFilter,
    highpass: highPassFilter !== "off" ? highPassFilter : 0,
    lowpass: lowPassFilter,
    outputMode: outputMode === "stereo" ? "STEREO" : undefined,
    soundMode: soundMode?.toUpperCase(),
  };
}

function getDialogueEnhancementLevel(
  level: NonNullable<ReceiverSettings["dialogueEnhancement"]>,
): 0 | 1 | 2 | 3 {
  switch (level) {
    case "high": {
      return 3;
    }

    case "low": {
      return 1;
    }

    case "medium": {
      return 2;
    }

    case "off": {
      return 0;
    }
  }
}

function getDigitalFilterValue(
  digitalFilter: NonNullable<ReceiverSettings["digitalFilter"]>,
): AudioConfig["digitalFilter"] {
  switch (digitalFilter) {
    case "filter1": {
      return "FILTER_1";
    }

    case "filter2": {
      return "FILTER_2";
    }
  }
}

function getLEDConfig({
  statusLedBrightness,
  touchControls,
}: LEDConfigReceiverSettings): LEDConfig | undefined {
  const networkLED =
    statusLedBrightness != null
      ? ({
          brightness: statusLedBrightness,
          name: "NETWORK",
        } satisfies NetworkLEDConfig)
      : undefined;

  const touchLED =
    touchControls != null
      ? ({
          enable: Binary(touchControls !== "off"),
          feedbackSoundsEnable: Binary(touchControls === "onWithSound"),
          name: "TOUCH",
        } satisfies TouchLEDConfig)
      : undefined;

  const led = [networkLED, touchLED].filter((led) => led != null);

  return led.length > 0 ? { led } : undefined;
}

function getLowLatencyConfig({
  audioDelay,
}: LowLatencyConfigReceiverSettings): LowLatencyConfig | undefined {
  if (audioDelay == null) {
    return undefined;
  }

  const enabled = audioDelay > 0 ? 1 : 0;

  return { delay: audioDelay, enabled };
}

function getTranscode(
  multiRoomAudioQuality: NonNullable<ReceiverSettings["multiRoomAudioQuality"]>,
): 0 | 1 {
  return multiRoomAudioQuality === "normal" ? 1 : 0;
}

function getTvConfig({
  dialogueEnhancement,
  nightMode,
  tvAutoplay,
  tvInput,
  tvRemoteCodes,
}: TvConfigReceiverSettings): Partial<TvConfig> {
  return {
    autoPlay: tvAutoplay != null ? Binary(tvAutoplay === "on") : undefined,
    dialogueEnhance:
      dialogueEnhancement != null
        ? {
            // TODO: this is not part of the iPhone request and may indicate
            // whether this feature is enabled. Consider removing
            enabled: dialogueEnhancement !== "off" ? 1 : 0,
            level: getDialogueEnhancementLevel(dialogueEnhancement),
          }
        : undefined,
    input: tvInput != null ? getTvInput(tvInput) : undefined,
    nightMode:
      nightMode != null
        ? {
            // TODO: this is not part of the iPhone request and may indicate
            // whether this feature is enabled. Consider removing
            enabled: nightMode !== "off" ? 1 : 0,
            level: nightMode !== "off" ? 1 : 0,
          }
        : undefined,
    tvRemoteCodes:
      tvRemoteCodes != null ? Binary(tvRemoteCodes === "on") : undefined,
  };
}

function getTvInput(
  tvInput: NonNullable<ReceiverSettings["tvInput"]>,
): "ANY" | "HDMI-ARC" | "NONE" | "OPTICAL" {
  switch (tvInput) {
    case "auto": {
      return "ANY";
    }

    case "hdmi": {
      return "HDMI-ARC";
    }

    case "none": {
      return "NONE";
    }

    case "optical": {
      return "OPTICAL";
    }
  }
}

function minifyConfig<T extends Record<string, unknown>>(
  config: T,
): NonNullishValues<T> | undefined {
  const withoutNullishValues = removeNullishValueEntries(config);
  if (isEmptyObject(withoutNullishValues)) {
    return undefined;
  }

  return withoutNullishValues;
}
