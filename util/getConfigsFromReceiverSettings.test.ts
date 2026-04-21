import { describe, expect, it } from "vitest";

import {
  type ConfigsFromReceiverSettings,
  getConfigsFromReceiverSettings,
} from "./getConfigsFromReceiverSettings.js";

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

  it("dialogueEnhancement off", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogueEnhancement: "off",
    });

    expect(configs).toEqual({
      TvConfig: { dialogueEnhance: { enabled: 0, level: 0 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("dialogueEnhancement low", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogueEnhancement: "low",
    });

    expect(configs).toEqual({
      TvConfig: { dialogueEnhance: { enabled: 1, level: 1 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("dialogueEnhancement medium", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogueEnhancement: "medium",
    });

    expect(configs).toEqual({
      TvConfig: { dialogueEnhance: { enabled: 1, level: 2 } },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("dialogueEnhancement high", () => {
    const configs = getConfigsFromReceiverSettings({
      dialogueEnhancement: "high",
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

  it("balance left", () => {
    const configs = getConfigsFromReceiverSettings({
      balance: -20,
    });

    expect(configs).toEqual({
      Balance: 0,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("balance center", () => {
    const configs = getConfigsFromReceiverSettings({
      balance: 0,
    });

    expect(configs).toEqual({
      Balance: 20,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("balance right", () => {
    const configs = getConfigsFromReceiverSettings({
      balance: 20,
    });

    expect(configs).toEqual({
      Balance: 40,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("bass min", () => {
    const configs = getConfigsFromReceiverSettings({
      bass: -5,
    });

    expect(configs).toEqual({
      Bass: 0,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("bass even", () => {
    const configs = getConfigsFromReceiverSettings({
      bass: 0,
    });

    expect(configs).toEqual({
      Bass: 5,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("bass max", () => {
    const configs = getConfigsFromReceiverSettings({
      bass: 5,
    });

    expect(configs).toEqual({
      Bass: 10,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("subwoofer min", () => {
    const configs = getConfigsFromReceiverSettings({
      subwoofer: -15,
    });

    expect(configs).toEqual({
      Subwoofer: 0,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("subwoofer even", () => {
    const configs = getConfigsFromReceiverSettings({
      subwoofer: 0,
    });

    expect(configs).toEqual({
      Subwoofer: 15,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("subwoofer max", () => {
    const configs = getConfigsFromReceiverSettings({
      subwoofer: 15,
    });

    expect(configs).toEqual({
      Subwoofer: 30,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("treble min", () => {
    const configs = getConfigsFromReceiverSettings({
      treble: -5,
    });

    expect(configs).toEqual({
      Treble: 0,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("treble even", () => {
    const configs = getConfigsFromReceiverSettings({
      treble: 0,
    });

    expect(configs).toEqual({
      Treble: 5,
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("treble max", () => {
    const configs = getConfigsFromReceiverSettings({
      treble: 5,
    });

    expect(configs).toEqual({
      Treble: 10,
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
        led: [{ brightness: 75, name: "NETWORK" }],
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
        led: [{ enable: 0, feedbackSoundsEnable: 0, name: "TOUCH" }],
      },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("touchControls on", () => {
    const configs = getConfigsFromReceiverSettings({
      touchControls: "on",
    });

    expect(configs).toEqual({
      LEDConfig: {
        led: [{ enable: 1, feedbackSoundsEnable: 0, name: "TOUCH" }],
      },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("touchControls onWithSound", () => {
    const configs = getConfigsFromReceiverSettings({
      touchControls: "onWithSound",
    });

    expect(configs).toEqual({
      LEDConfig: {
        led: [{ enable: 1, feedbackSoundsEnable: 1, name: "TOUCH" }],
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

  it("diracLiveFilter off", () => {
    const configs = getConfigsFromReceiverSettings({
      diracLiveFilter: "off",
    });

    expect(configs).toEqual({
      AudioConfig: { diracActiveFilter: "off" },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("diracLiveFilter on", () => {
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
      LowLatencyConfig: { delay: 0, enabled: 0 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });

  it("audioDelay 100", () => {
    const configs = getConfigsFromReceiverSettings({
      audioDelay: 100,
    });

    expect(configs).toEqual({
      LowLatencyConfig: { delay: 100, enabled: 1 },
    } satisfies Partial<ConfigsFromReceiverSettings>);
  });
});
