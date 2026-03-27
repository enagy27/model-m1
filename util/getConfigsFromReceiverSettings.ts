import * as v from "valibot";
import { type ReceiverSettings } from "./receiverSettings";
import {
  AudioConfig,
  LEDConfig,
  NetworkLEDConfig,
  TouchLEDConfig,
  TvConfig,
} from "./control";
import {
  isEmptyObject,
  NonNullishValues,
  removeNullishValueEntries,
} from "./object";

function Binary(value: boolean) {
  return value ? 1 : 0;
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

function minifyConfig<T extends Record<string, unknown>>(
  config: T,
): NonNullishValues<T> | undefined {
  const withoutNullishValues = removeNullishValueEntries(config);
  if (isEmptyObject(withoutNullishValues)) {
    return undefined;
  }

  return withoutNullishValues;
}

/**
 * Transforms user-facing settings to the internal command language
 * of the device.
 */
export function getConfigsFromReceiverSettings({
  statusLedBrightness,
  touchControls,
  volumeLimit,
  subwooferLevel,
  lowPassFilter,
  digitalFilter,
  balance: _balance,
  outputMode,
  highPassFilter,
  tvInput: _tvInput,
  tvAutoplay,
  tvRemoteCodes,
  audioDelay,
}: ReceiverSettings) {
  const networkLED =
    statusLedBrightness != null
      ? ({
          name: "NETWORK",
          brightness: statusLedBrightness,
        } satisfies NetworkLEDConfig)
      : undefined;

  const touchLED =
    touchControls != null
      ? ({
          name: "TOUCH",
          enable: Binary(touchControls !== "off"),
          feedbackSoundsEnable: Binary(touchControls === "onWithSound"),
        } satisfies TouchLEDConfig)
      : undefined;

  const led = [networkLED, touchLED].filter((led) => led != null);

  return {
    AudioConfig: minifyConfig({
      bassBoost: subwooferLevel,
      lowpass: lowPassFilter,
      digitalFilter:
        digitalFilter != null
          ? getDigitalFilterValue(digitalFilter)
          : undefined,

      outputMode: outputMode === "stereo" ? "STEREO" : undefined,
      highpass: highPassFilter,
    } satisfies Partial<AudioConfig>),

    LEDConfig:
      led.length > 0
        ? (minifyConfig({ led }) satisfies LEDConfig | undefined)
        : undefined,

    TVConfig: minifyConfig({
      autoPlay: tvAutoplay != null ? Binary(tvAutoplay === "on") : undefined,
      audioDelay,
      tvRemoteCodes:
        tvRemoteCodes != null ? Binary(tvRemoteCodes === "on") : undefined,
    } satisfies Partial<TvConfig>),

    VolumeLimit: volumeLimit satisfies number | undefined,
  };
}
