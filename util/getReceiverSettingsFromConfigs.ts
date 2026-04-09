import type {
  AudioConfig,
  LEDConfig,
  LowLatencyConfig,
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
  lowLatencyConfig: LowLatencyConfig;
  tvConfig: TvConfig;
  transcode: boolean;
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
    case "filter3": {
      return diracActiveFilter;
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
  audioConfig,
  ledConfig,
  lowLatencyConfig,
  tvConfig,
  transcode,
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
    multiRoomAudioQuality: transcode ? "normal" : "high",
    statusLedBrightness: networkLED?.brightness,
    // energyMode? may not be working in the app? May be another port?
    volumeLimit,
    touchControls: touchLED ? getTouchControls(touchLED) : undefined,
    // subwooferLevel? /upnp/control/renderer_dvc/RenderingControl
    // <u:X_SetSubwoofer xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
    // <InstanceID>0</InstanceID>
    // <Channel>Master</Channel>
    // <DesiredLevel>18</DesiredLevel>
    // </u:X_SetSubwoofer>
    lowPassFilter: audioConfig.lowpass,
    digitalFilter: getDigitalFilter(audioConfig.digitalFilter),
    diracLiveFilter: getDiracLiveFilter(audioConfig.diracActiveFilter),
    // balance? /upnp/control/renderer_dvc/RenderingControl
    // <u:X_SetBalance xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">
    // <InstanceID>0</InstanceID>
    // <Channel>Master</Channel>
    // <DesiredBalance>24</DesiredBalance>
    // </u:X_SetBalance>
    highPassFilter: audioConfig.highpass,
    tvInput: getTvInput(tvConfig.input),
    tvAutoplay: tvConfig.autoPlay ? "on" : "off",
    tvRemoteCodes: tvConfig.tvRemoteCodes ? "on" : "off",
    audioDelay: lowLatencyConfig.enabled ? lowLatencyConfig.delay : 0,
  };
}
