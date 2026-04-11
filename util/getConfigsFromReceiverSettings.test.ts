import { describe, it, expect, vi } from "vitest";
import {
  getConfigsFromReceiverSettings,
  type ConfigsFromReceiverSettings,
} from "./getConfigsFromReceiverSettings";

describe("getConfigsFromReceiverSettings", () => {
  it("soundMode direct", () => {
    const configs = getConfigsFromReceiverSettings({
      soundMode: "direct",
    });

    expect(configs).toEqual({
      AudioConfig: { soundMode: "DIRECT" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("soundMode stereo", () => {
    const configs = getConfigsFromReceiverSettings({
      soundMode: "stereo",
    });

    expect(configs).toEqual({
      AudioConfig: { soundMode: "STEREO" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("soundMode virtual", () => {
    const configs = getConfigsFromReceiverSettings({
      soundMode: "virtual",
    });

    expect(configs).toEqual({
      AudioConfig: { soundMode: "VIRTUAL" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("dialogEnhancement off", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogEnhancement: "off",
    });

    expect(configs).toEqual({
      TvConfig: { dialogueEnhance: { enabled: 0, level: 0 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("dialogEnhancement low", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogEnhancement: "low",
    });

    expect(configs).toEqual({
      TvConfig: { dialogueEnhance: { enabled: 1, level: 1 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("dialogEnhancement medium", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogEnhancement: "medium",
    });

    expect(configs).toEqual({
      TvConfig: { dialogueEnhance: { enabled: 1, level: 2 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("dialogEnhancement high", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogEnhancement: "high",
    });

    expect(configs).toEqual({
      TvConfig: { dialogueEnhance: { enabled: 1, level: 3 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("nightMode off", () => {
    const configs = getConfigsFromReceiverSettings({
      nightMode: "off",
    });

    expect(configs).toEqual({
      TvConfig: { nightMode: { enabled: 0, level: 0 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("nightMode on", () => {
    const configs = getConfigsFromReceiverSettings({
      nightMode: "on",
    });

    expect(configs).toEqual({
      TvConfig: { nightMode: { enabled: 1, level: 1 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("multiRoomAudioQuality normal", () => {
    const configs = getConfigsFromReceiverSettings({
      multiRoomAudioQuality: "normal",
    });

    expect(configs).toEqual({
      transcode: 1,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("multiRoomAudioQuality high", () => {
    const configs = getConfigsFromReceiverSettings({
      multiRoomAudioQuality: "high",
    });

    expect(configs).toEqual({
      transcode: 0,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("statusLedBrightness", () => {
    const configs = getConfigsFromReceiverSettings({
      statusLedBrightness: 75,
    });

    expect(configs).toEqual({
      LEDConfig: {
        led: [{ name: "NETWORK", brightness: 75 }],
      },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("volumeLimit", () => {
    const configs = getConfigsFromReceiverSettings({
      volumeLimit: 75,
    });

    expect(configs).toEqual({
      VolumeLimit: 75,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("touchControls off", () => {
    const configs = getConfigsFromReceiverSettings({
      touchControls: "off",
    });

    expect(configs).toEqual({
      LEDConfig: {
        led: [{ name: "TOUCH", enable: 0, feedbackSoundsEnable: 0 }],
      },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("touchControls on", () => {
    const configs = getConfigsFromReceiverSettings({
      touchControls: "on",
    });

    expect(configs).toEqual({
      LEDConfig: {
        led: [{ name: "TOUCH", enable: 1, feedbackSoundsEnable: 0 }],
      },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("touchControls onWithSound", () => {
    const configs = getConfigsFromReceiverSettings({
      touchControls: "onWithSound",
    });

    expect(configs).toEqual({
      LEDConfig: {
        led: [{ name: "TOUCH", enable: 1, feedbackSoundsEnable: 1 }],
      },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("lowPassFilter", () => {
    const configs = getConfigsFromReceiverSettings({
      lowPassFilter: 90,
    });

    expect(configs).toEqual({
      AudioConfig: { lowpass: 90 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("digitalFilter", () => {
    const configs = getConfigsFromReceiverSettings({
      digitalFilter: "filter1",
    });

    expect(configs).toEqual({
      AudioConfig: { digitalFilter: "FILTER_1" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("diracLiveFilter", () => {
    const configs = getConfigsFromReceiverSettings({
      diracLiveFilter: "filter3",
    });

    expect(configs).toEqual({
      AudioConfig: { diracActiveFilter: "filter3" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("outputMode", () => {
    const configs = getConfigsFromReceiverSettings({
      outputMode: "stereo",
    });

    expect(configs).toEqual({
      AudioConfig: { outputMode: "STEREO" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("highPassFilter off", () => {
    const configs = getConfigsFromReceiverSettings({
      highPassFilter: "off",
    });

    expect(configs).toEqual({
      AudioConfig: { highpass: 0 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("highPassFilter", () => {
    const configs = getConfigsFromReceiverSettings({
      highPassFilter: 120,
    });

    expect(configs).toEqual({
      AudioConfig: { highpass: 120 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvInput auto", () => {
    const configs = getConfigsFromReceiverSettings({
      tvInput: "auto",
    });

    expect(configs).toEqual({
      TvConfig: { input: "ANY" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvInput hdmi", () => {
    const configs = getConfigsFromReceiverSettings({
      tvInput: "hdmi",
    });

    expect(configs).toEqual({
      TvConfig: { input: "HDMI-ARC" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvInput optical", () => {
    const configs = getConfigsFromReceiverSettings({
      tvInput: "optical",
    });

    expect(configs).toEqual({
      TvConfig: { input: "OPTICAL" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvInput none", () => {
    const configs = getConfigsFromReceiverSettings({
      tvInput: "none",
    });

    expect(configs).toEqual({
      TvConfig: { input: "NONE" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvAutoplay off", () => {
    const configs = getConfigsFromReceiverSettings({
      tvAutoplay: "off",
    });

    expect(configs).toEqual({
      TvConfig: { autoPlay: 0 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvAutoplay on", () => {
    const configs = getConfigsFromReceiverSettings({
      tvAutoplay: "on",
    });

    expect(configs).toEqual({
      TvConfig: { autoPlay: 1 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvRemoteCodes off", () => {
    const configs = getConfigsFromReceiverSettings({
      tvRemoteCodes: "off",
    });

    expect(configs).toEqual({
      TvConfig: { tvRemoteCodes: 0 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("tvRemoteCodes on", () => {
    const configs = getConfigsFromReceiverSettings({
      tvRemoteCodes: "on",
    });

    expect(configs).toEqual({
      TvConfig: { tvRemoteCodes: 1 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("audioDelay 0", () => {
    const configs = getConfigsFromReceiverSettings({
      audioDelay: 0,
    });

    expect(configs).toEqual({
      LowLatencyConfig: { enabled: 0, delay: 0 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("audioDelay 100", () => {
    const configs = getConfigsFromReceiverSettings({
      audioDelay: 100,
    });

    expect(configs).toEqual({
      LowLatencyConfig: { enabled: 1, delay: 100 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });
});
