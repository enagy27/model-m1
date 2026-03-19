import type { ReceiverSettings } from "./util/receiverSettings";

export const preset = {
    multiRoomAudioQuality: "high",
    statusLedBrightness: 100,
    energyMode: "autoSleep",
    volumeLimit: 100,
    touchControls: "on",
    subwooferLevel: 0,
    lowPassFilter: 120,
    digitalFilter: "filter1",
    balance: 0,
    outputMode: "stereo",
    highPassFilter: 80,
    tvInput: "hdmi",
    tvAutoplay: "on",
    tvRemoteCodes: "on",
    audioDelay: 100,
} satisfies ReceiverSettings
