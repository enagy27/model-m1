import * as v from "valibot";

const receiverSettingsSchema = v.object({
  /**
   * Choose how to distribute high-bitrate audio sources such as WAV or PCM
   * (including audio from external inputs) when playing in multi-room groups.
   * 
   * Normal: high bitrate audio is compressed in AAC 256 kbps before being
   * distributed to other rooms. This improves reliability and network
   * performance.
   * 
   * High: high bitrate audio is sent in PCM 16 bits 44.1 kHz non-compressed
   * to other rooms. Do not use this option unless your devices are connected
   * via ethernet or if all grouped devices are using an excellent wifi signal.
   */
  multiRoomAudioQuality: v.picklist(["normal", "high"]),
  /**
   * Adjust the front status LED brightness.
   */
  statusLedBrightness: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  /**
   * Choose how the device uses energy.
   * 
   * Auto sleep: the device uses less energie and will take longer to respond
   * while it wakes.
   * 
   * Quick start: the device responds immediately and never sleeps. This consumes
   * more energy.
   */
  energyMode: v.picklist(["autoSleep", "quickStart"]),
  /**
   * Limiting volume can protect speakers if volume levels exceed the power
   * capabilities of your speakers.
   */
  volumeLimit: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  /**
   * Touch controls on the front of the device. Can be off, on, or on and with
   * sounds as feedback.
   */
  touchControls: v.picklist(["off", "on", "onWithSound"]),
  /**
   * Subwoofer equalization level.
   */
  subwooferLevel: v.pipe(v.number(), v.minValue(-15), v.maxValue(15)),
  /**
   * Filter below which the subwoofer will be active.
   */
  lowPassFilter: v.picklist([40, 60, 80, 90, 100, 110, 120]),
  /**
   * Apply different audio filters for different tonal profiles.
   */
  digitalFilter: v.picklist(["filter1", "filter2"]),
  /**
   * Biases towards the left speaker (negative values) or towards the right speaker
   * (positive values).
   */
  balance: v.pipe(v.number(), v.minValue(-6), v.maxValue(6)),
  /**
   * Determines whether audio will be split into two channels or duplicated by each
   * speaker.
   */
  outputMode: v.picklist(["stereo", "dualMono"]),
  /**
   * Filter above which the left and right speakers will be active.
   */
  highPassFilter: v.picklist([40, 60, 80, 100, 110, 120]),
  /**
   * Determines which source to use as audio for the TV.
   */
  tvInput: v.picklist(["auto", "hdmi", "optical", "none"]),
  /**
   * Determines whether TV audio source will be switched to by default once active.
   */
  tvAutoplay: v.picklist(["off", "on"]),
  /**
   * When active, this device responds to the most commonly used IR volume commands
   * from the TV remote without having to learn the IR codes for your particular TV.
   */
  tvRemoteCodes: v.picklist(["off", "on"]),
  /** 
   * Allows you to associate other "Powered by HEOS" devices to the Marantz Model M1
   * in order to listen to listen to the TV in other rooms.
   * 
   * In case of an echo, it is possible to reduce the delay between the Marantz Model M1
   * and the other devices to improve the synchronization and audio playback.
   * 
   * Warning: too short of a delay may cause audio to drop as network performance degrades.
   * If you experience drops, increase the delay.
   */
  audioDelay: v.pipe(v.number(), v.minValue(0), v.maxValue(500)),
});

export type ReceiverSettings = v.InferOutput<typeof receiverSettingsSchema>;
