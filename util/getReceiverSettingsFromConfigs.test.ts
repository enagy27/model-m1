import { describe, expect, it, vi } from "vitest";

import type {
  NetworkLEDConfig,
  TouchLEDConfig,
} from "./createControlClient.js";
import type { ReceiverSettings } from "./receiverSettings.js";

import {
  getReceiverSettingsFromConfigs,
  type GetReceiverSettingsFromConfigsArgs,
} from "./getReceiverSettingsFromConfigs.js";

type PartialAudioConfig = GetReceiverSettingsFromConfigsArgs["AudioConfig"];
type PartialTvConfig = GetReceiverSettingsFromConfigsArgs["TvConfig"];

function AudioConfigFixture(
  overrides?: Partial<PartialAudioConfig>,
): PartialAudioConfig {
  return {
    digitalFilter: "FILTER_1",
    diracActiveFilter: "filter1",
    highpass: 100,
    lowpass: 100,
    outputMode: "STEREO",
    soundMode: "STEREO",
    ...overrides,
  };
}

function configsFixture(
  overrides: Partial<GetReceiverSettingsFromConfigsArgs>,
): GetReceiverSettingsFromConfigsArgs {
  return {
    AudioConfig: AudioConfigFixture(),
    Balance: 20,
    Bass: 5,
    LEDConfig: { led: [networkLEDConfigFigure(), touchLEDConfigFigure()] },
    LowLatencyConfig: { delay: 100, enabled: 1 },
    output: {
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      table: vi.fn(),
    },
    Subwoofer: 15,
    transcode: 1,
    Treble: 5,
    TvConfig: TvConfigFixture(),
    VolumeLimit: 100,
    ...overrides,
  };
}

function networkLEDConfigFigure(
  overrides?: Partial<NetworkLEDConfig>,
): NetworkLEDConfig {
  return { brightness: 100, name: "NETWORK", ...overrides };
}

function receiverSettingsFixture(
  overrides: ReceiverSettings,
): ReceiverSettings {
  return {
    audioDelay: 100,
    balance: 0,
    bass: 0,
    dialogueEnhancement: "off",
    digitalFilter: "filter1",
    diracLiveFilter: "filter1",
    highPassFilter: 100,
    lowPassFilter: 100,
    multiRoomAudioQuality: "normal",
    nightMode: "off",
    outputMode: "stereo",
    soundMode: "stereo",
    statusLedBrightness: 100,
    subwoofer: 0,
    touchControls: "onWithSound",
    treble: 0,
    tvAutoplay: "on",
    tvInput: "auto",
    tvRemoteCodes: "on",
    volumeLimit: 100,
    ...overrides,
  };
}

function touchLEDConfigFigure(
  overrides?: Partial<TouchLEDConfig>,
): TouchLEDConfig {
  return { enable: 1, feedbackSoundsEnable: 1, name: "TOUCH", ...overrides };
}

function TvConfigFixture(
  overrides?: Partial<PartialTvConfig>,
): PartialTvConfig {
  return {
    autoPlay: 1,
    dialogueEnhance: { enabled: 0, level: 0 },
    input: "ANY",
    nightMode: { enabled: 0, level: 0 },
    tvRemoteCodes: 1,
    ...overrides,
  };
}

describe("getReceiverSettingsFromConfigs", () => {
  it("audioDelay disabled", () => {
    const configs = configsFixture({
      LowLatencyConfig: { delay: 100, enabled: 0 },
    });

    const settings = getReceiverSettingsFromConfigs(configs);
    expect(settings).toEqual(receiverSettingsFixture({ audioDelay: 0 }));
  });

  it("audioDelay enabled", () => {
    const configs = configsFixture({
      LowLatencyConfig: { delay: 325, enabled: 1 },
    });

    const settings = getReceiverSettingsFromConfigs(configs);
    expect(settings).toEqual(receiverSettingsFixture({ audioDelay: 325 }));
  });

  it("dialogueEnhancement disabled", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        dialogueEnhance: { enabled: 0, level: 1 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ dialogueEnhancement: "off" }),
    );
  });

  it("dialogueEnhancement enabled level 0", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        dialogueEnhance: { enabled: 1, level: 0 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ dialogueEnhancement: "off" }),
    );
  });

  it("dialogueEnhancement low", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        dialogueEnhance: { enabled: 1, level: 1 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ dialogueEnhancement: "low" }),
    );
  });

  it("dialogueEnhancement medium", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        dialogueEnhance: { enabled: 1, level: 2 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ dialogueEnhancement: "medium" }),
    );
  });

  it("dialogueEnhancement high", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        dialogueEnhance: { enabled: 1, level: 3 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ dialogueEnhancement: "high" }),
    );
  });

  it("digitalFilter", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({ digitalFilter: "FILTER_2" }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ digitalFilter: "filter2" }),
    );
  });

  it("diracLiveFilter off", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({ diracActiveFilter: "off" }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ diracLiveFilter: "off" }),
    );
  });

  it("diracLiveFilter on", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({ diracActiveFilter: "filter3" }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ diracLiveFilter: "filter3" }),
    );
  });

  it("highPassFilter", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({ highpass: 80 }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ highPassFilter: 80 }));
  });

  it("highPassFilter off", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({ highpass: 0 }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ highPassFilter: "off" }),
    );
  });

  it("lowPassFilter", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({ lowpass: 80 }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ lowPassFilter: 80 }));
  });

  it("multiRoomAudioQuality normal", () => {
    const configs = configsFixture({ transcode: 1 });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      expect.objectContaining({ multiRoomAudioQuality: "normal" }),
    );
  });

  it("multiRoomAudioQuality high", () => {
    const configs = configsFixture({ transcode: 0 });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      expect.objectContaining({ multiRoomAudioQuality: "high" }),
    );
  });

  it("nightMode disabled", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        nightMode: { enabled: 0, level: 0 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ nightMode: "off" }));
  });

  it("nightMode enabled level 0", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        nightMode: { enabled: 1, level: 0 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ nightMode: "off" }));
  });

  it("balance left", () => {
    const configs = configsFixture({
      Balance: 0,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ balance: -20 }));
  });

  it("balance center", () => {
    const configs = configsFixture({
      Balance: 20,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ balance: 0 }));
  });

  it("balance right", () => {
    const configs = configsFixture({
      Balance: 40,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ balance: 20 }));
  });

  it("bass min", () => {
    const configs = configsFixture({
      Bass: 0,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ bass: -5 }));
  });

  it("bass even", () => {
    const configs = configsFixture({
      Bass: 5,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ bass: 0 }));
  });

  it("bass max", () => {
    const configs = configsFixture({
      Bass: 10,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ bass: 5 }));
  });

  it("subwoofer min", () => {
    const configs = configsFixture({
      Subwoofer: 0,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ subwoofer: -15 }));
  });

  it("subwoofer even", () => {
    const configs = configsFixture({
      Subwoofer: 15,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ subwoofer: 0 }));
  });

  it("subwoofer max", () => {
    const configs = configsFixture({
      Subwoofer: 30,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ subwoofer: 15 }));
  });

  it("treble min", () => {
    const configs = configsFixture({
      Treble: 0,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ treble: -5 }));
  });

  it("treble even", () => {
    const configs = configsFixture({
      Treble: 5,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ treble: 0 }));
  });

  it("treble max", () => {
    const configs = configsFixture({
      Treble: 10,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ treble: 5 }));
  });

  it("nightMode enabled", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({
        nightMode: { enabled: 1, level: 1 },
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ nightMode: "on" }));
  });

  it("outputMode stereo", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({
        outputMode: "STEREO",
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ outputMode: "stereo" }));
  });

  it("soundMode direct", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({
        soundMode: "DIRECT",
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ soundMode: "direct" }));
  });

  it("soundMode stereo", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({
        soundMode: "STEREO",
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(expect.objectContaining({ soundMode: "stereo" }));
  });

  it("soundMode virtual", () => {
    const configs = configsFixture({
      AudioConfig: AudioConfigFixture({
        soundMode: "VIRTUAL",
      }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ soundMode: "virtual" }));
  });

  it("statusLedBrightness", () => {
    const configs = configsFixture({
      LEDConfig: {
        led: [
          networkLEDConfigFigure({ brightness: 45 }),
          touchLEDConfigFigure(),
        ],
      },
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ statusLedBrightness: 45 }),
    );
  });

  it("touchControls off", () => {
    const configs = configsFixture({
      LEDConfig: {
        led: [networkLEDConfigFigure(), touchLEDConfigFigure({ enable: 0 })],
      },
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ touchControls: "off" }));
  });

  it("touchControls on", () => {
    const configs = configsFixture({
      LEDConfig: {
        led: [
          networkLEDConfigFigure(),
          touchLEDConfigFigure({ enable: 1, feedbackSoundsEnable: 0 }),
        ],
      },
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ touchControls: "on" }));
  });

  it("touchControls onWithSound", () => {
    const configs = configsFixture({
      LEDConfig: {
        led: [
          networkLEDConfigFigure(),
          touchLEDConfigFigure({ enable: 1, feedbackSoundsEnable: 1 }),
        ],
      },
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(
      receiverSettingsFixture({ touchControls: "onWithSound" }),
    );
  });

  it("tvAutoPlay off", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ autoPlay: 0 }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvAutoplay: "off" }));
  });

  it("tvAutoPlay on", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ autoPlay: 1 }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvAutoplay: "on" }));
  });

  it("tvInput auto", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ input: "ANY" }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvInput: "auto" }));
  });

  it("tvInput hdmi eArc", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ input: "HDMI-ARC" }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvInput: "hdmi" }));
  });

  it("tvInput optical", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ input: "OPTICAL" }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvInput: "optical" }));
  });

  it("tvInput none", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ input: "NONE" }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvInput: "none" }));
  });

  it("tvRemoteCodes off", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ tvRemoteCodes: 0 }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvRemoteCodes: "off" }));
  });

  it("tvRemoteCodes on", () => {
    const configs = configsFixture({
      TvConfig: TvConfigFixture({ tvRemoteCodes: 1 }),
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ tvRemoteCodes: "on" }));
  });

  it("volumeLimit", () => {
    const configs = configsFixture({
      VolumeLimit: 65,
    });

    const settings = getReceiverSettingsFromConfigs(configs);

    expect(settings).toEqual(receiverSettingsFixture({ volumeLimit: 65 }));
  });
});
