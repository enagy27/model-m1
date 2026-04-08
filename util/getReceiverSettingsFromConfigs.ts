import type { Primitive } from "type-fest";
import type {
  AudioConfig,
  LEDConfig,
  TouchLEDConfig,
  TvConfig,
} from "./control";
import type { IOutput } from "./output";
import type { ReceiverSettings } from "./receiverSettings";

type ReceiverSettingsResponseOverrides = {
  lowPassFilter?: number;
  highPassFilter?: number;
  digitalFilter?: string;
};

type ReceiverSettingsResponse = Omit<
  ReceiverSettings,
  keyof ReceiverSettingsResponseOverrides
> &
  ReceiverSettingsResponseOverrides;

type GetReceiverSettingsFromConfigsArgs = {
  audioConfig: AudioConfig;
  ledConfig: LEDConfig;
  tvConfig: TvConfig;
  volumeLimit: number;
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

export function getReceiverSettingsFromConfigs({
  audioConfig,
  ledConfig,
  tvConfig,
  volumeLimit,
  output,
}: GetReceiverSettingsFromConfigsArgs): ReceiverSettingsResponse {
  const soundMode = getSoundMode(audioConfig.soundMode);
  if (soundMode == null) {
    output.debug(`unknown soundMode: ${soundMode}`);
  }

  const dialogEnhancement = getDialogEnhancement(tvConfig.dialogueEnhance);
  if (dialogEnhancement == null) {
    output.debug(`unknown dialogEnhance: ${tvConfig.dialogueEnhance}`);
  }

  const nightMode = getNightMode(tvConfig.nightMode);

  const { led } = ledConfig;
  const networkLED = led.find((diode) => diode.name === "NETWORK");
  const touchLED = led.find((diode) => diode.name === "TOUCH");

  return {
    soundMode,
    dialogEnhancement,
    nightMode,
    // multiRoomAudioQuality
    statusLedBrightness: networkLED?.brightness,
    // energyMode?
    // TODO: this does not toggle the limit, just sets the value
    volumeLimit,
    touchControls: touchLED ? getTouchControls(touchLED) : undefined,
    // subwooferLevel:
    lowPassFilter: audioConfig.lowpass,
    digitalFilter: audioConfig.digitalFilter,
    // balance?
    highPassFilter: audioConfig.highpass,
    // tvInput
    tvAutoplay: tvConfig.autoPlay ? "on" : "off",
    tvRemoteCodes: tvConfig.tvRemoteCodes ? "on" : "off",
    // audioDelay: TvConfig.audioDelay,
  };
}
