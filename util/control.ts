import XMLBuilder from "fast-xml-builder";
import * as v from "valibot";

import { serializeHeaders } from "./tcp";
import { upnpService } from "../env";

type IOutput = {
  log(this: void, info: string): void;
  debug(this: void, info: string): void;
  error(this: void, err: string): void;
};

const primitiveSchema = v.union([
  v.bigint(),
  v.boolean(),
  v.number(),
  v.string(),
]);

export type ControlArgs = {
  readonly host: string;
  readonly pathname: string;
  write(message: string): void;
  readonly output: IOutput;
};

type OutputMode = "STEREO"; // or double mono?
type SoundMode = "DIRECT" | "STEREO" | "VIRTUAL";

/** Audio settings for things like filters and sound modes */
export type AudioConfig = {
  highpass: 40 | 80 | 90 | 100 | 110 | 120 | 150 | 200 | 250; // or off?
  lowpass: 40 | 60 | 80 | 90 | 100 | 110 | 120; // can I shut this off?
  subwooferEnable: unknown;
  outputMode: OutputMode;
  ampBridged: unknown;
  soundMode: SoundMode;
  impedance: unknown;
  ampPower: unknown;
  availableSoundModes: "DIRECT,STEREO,VIRTUAL";
  sourceDirect: unknown;
  bassBoost: unknown;
  speakerOption: "NORMAL"; // others?
  toneControlOption: unknown;
  tilt: unknown;
  digitalFilter: "FILTER_1" | "FILTER_2";
  availableDigitalFilter: "FILTER_1,FILTER_2";
  diracHistory: unknown;
};

export type NetworkLEDConfig = {
  name: "NETWORK";
  brightness: number; /* 0-100 */
};

export type TouchLEDConfig = {
  name: "TOUCH";
  feedbackSoundsEnable: 0 | 1;
  enable: 0 | 1;
};

type IndividualLEDConfig = NetworkLEDConfig | TouchLEDConfig;

/** Controls LEDs on the front of the device showing network status and touch response */
export type LEDConfig = { led: IndividualLEDConfig[] };

/**
 * Config for syncing audio and video. Applies an artificial delay to audio signal to
 * account for slower video processing.
 */
type LowLatencyConfig = {
  enabled: 0 | 1;
  /** Delay time in milliseconds */
  delay: number;
};

type NetworkConfiguration = {
  "@_id": string;
  "@_dhcpOn": "0" | "1";
  "@_enabled": "true" | "false";
  Name: "eth0" | "wlan0";
  Type: "LAN" | "WLAN";
  IP: string;
  Netmask: string;
  Gateway: string;
  DNS1: string;
  DNS2: string;
  DNS3: string;
  gwMac: string;
  wirelessProfile?: WirelessProfile;
};

type SpeakerChannel = {
  distance: number;
  level: number;
  test_tone: 0 | 1;
};

type StereoSpeakerGroup = {
  enabled: 0 | 1;
  crossover: number;
  Right: SpeakerChannel;
  Left: SpeakerChannel;
};

type CenterSpeakerGroup = {
  enabled: 0 | 1;
  crossover: number;
  Center: SpeakerChannel;
};

type SubwooferGroup = {
  enabled: 0 | 1;
  lowpass: number; // Hz
  phase: number; // degrees (0 or 180 typically)
  Subwoofer: SpeakerChannel;
};

type SurroundSpeakerConfig = {
  Front: StereoSpeakerGroup;
  Center: CenterSpeakerGroup;
  Subwoofer: SubwooferGroup;
  Rear: StereoSpeakerGroup;
  DistUnit: "m" | "ft";
};

export type TvConfig = {
  input: string;
  connectedInputs: string;
  hdmiVolume: 0 | 1;
  hdmiConnection: "ARC" | "eARC" | unknown;
  remoteVolume: 0 | 1;
  autoPlay: 0 | 1;
  irFlasherFeedback: 0 | 1;
  allowZoning: 0 | 1;
  dialogueEnhance: {
    level: number; // 0-2?
    enabled: 0 | 1;
  };
  nightMode: {
    level: number;
    enabled: 0 | 1;
  };
  audioDelay: number;
  syncMode: "VIDEO" | "AUDIO" | string;
  bilingualMode: "MAIN_VOICE" | "SUB_VOICE" | string;

  /** IR Codes (0 = not learned) */
  irCodeVolPlus: number;
  irCodeVolMinus: number;
  irCodeMute: number;
  irCodeAux: number;
  irCodeLine: number;
  irCodeAnalog: number;
  irCodeAnalog1: number;
  irCodeAnalog2: number;
  irCodeCd: number;
  irCodeRecorder: number;
  irCodeCoaxial: number;
  irCodeOptical: number;
  irCodeOptical1: number;
  irCodeOptical2: number;
  irCodeOptical3: number;
  irCodeHdmi: number;
  irCodeHdmiArc: number;
  irCodeHdmi1: number;
  irCodeHdmi2: number;
  irCodeHdmi3: number;
  irCodeHdmi4: number;
  irCodeQuickSel1: number;
  irCodeQuickSel2: number;
  irCodeQuickSel3: number;
  irCodeQuickSel4: number;
  irCodeQuickSel5: number;
  irCodeQuickSel6: number;
  irCodePowerToggle: number;
  irCodePowerOn: number;
  irCodePowerOff: number;
  irCodeTv: number;
  irCodeBluetooth: number;
  irCodeSubwooferPlus: number;
  irCodeSubwooferMinus: number;
  irCodeBassPlus: number;
  irCodeBassMinus: number;
  irCodeNightMode: number;
  irCodeDialogue: number;
  irCodeSoundMovie: number;
  irCodeSoundMusic: number;
  irCodeSoundPure: number;
  irCodeSoundStereo: number;
  irCodeSoundDirect: number;
  irCodeSoundVirtual: number;
  irCodeDigitalFilter: number;

  dtsDialogControl: {
    level: number;
    enabled: 0 | 1;
    max: number;
  };
  tvRemoteCodes: 0 | 1;
};

type WirelessProfile = {
  "@_SSID": string;
  wirelessSecurity: {
    "@_enabled": "true" | "false";
    Mode: "WPA2-AES" | "WPA3" | "WEP" | "OPEN" | string;
  };
};

type ControlRequests = {
  // Configuration Token
  GetConfigurationToken: never;
  ApplyChanges: { configurationToken: string };
  CancelChanges: { configurationToken: string };
  ReleaseConfigurationToken: { configurationToken: string };

  // Firmware
  CancelFirmwareUpgrade: never;
  CheckForFirmwareUpgrade: never;
  GetUpgradeProgress: never;
  GetUpgradeStatus: never;
  UpdateFirmware: { configurationToken: string };

  // Network
  GetAccessPointList: { configurationToken: string };
  GetActiveInterface: never;
  GetNetworkConfiguration: { networkConfigurationId: string };
  GetNetworkConfigurationList: never;
  SetNetworkConfiguration: {
    configurationToken: string;
    networkConfiguration: Partial<NetworkConfiguration>;
  };
  GetWirelessProfile: never;
  GetWirelessState: never;
  GetWirelessStatus: never;
  SetWirelessProfile: {
    configurationToken: string;
    wirelessProfile: Partial<WirelessProfile>;
  };
  SetWPSPinSSID: { configurationToken: string; wpsPinSSID: string };
  GetP2PMode: never;
  GetHEOSNetID: never;
  SetHEOSNetID: { configurationToken: string; HEOSNetID: string };

  // Audio
  GetAudioConfig: never;
  SetAudioConfig: { AudioConfig: { AudioConfig: Partial<AudioConfig> } };
  GetVolumeLimit: never;
  SetVolumeLimit: { VolumeLimit: number };
  GetSurroundSpeakerConfig: never;
  SetSurroundSpeakerConfig: {
    SurroundSpeakerConfig: {
      SurroundSpeakerConfig: Partial<SurroundSpeakerConfig>;
    };
  };
  GetLowLatencyConfig: never;
  SetLowLatencyConfig: { LowLatencyConfig: Partial<LowLatencyConfig> };

  // Device Settings
  GetConfigurationStatus: never;
  SetConfigurationStatus: { configurationStatus: number };
  GetCurrentState: never;
  GetFriendlyName: never;
  SetFriendlyName: { configurationToken: string; friendlyName: string };
  GetLEDConfig: never;
  SetLEDConfig: { LEDConfig: { LEDConfig: Partial<LEDConfig> } };
  GetTranscode: never;
  SetTranscode: { transcode: boolean };

  // TV Config
  GetTvConfig: never;
  SetTvConfig: { TvConfig: Partial<TvConfig> };
};

type ControlRequestArgs<K extends keyof ControlRequests> =
  ControlRequests[K] extends never ? [K] : [K, ControlRequests[K]];

export function control({ host, pathname, write, output }: ControlArgs) {
  const builder = new XMLBuilder({ ignoreAttributes: false });

  function createBody<K extends keyof ControlRequests>(
    action: K,
    data: ControlRequests[K] | {},
  ) {
    const actionArgs = Object.fromEntries(
      Object.entries(data).map(([argName, value]: [string, unknown]) => {
        if (v.is(primitiveSchema, value)) {
          return [argName, value] as const;
        }

        return [argName, builder.build(value)] as const;
      }),
    );

    const body = {
      "s:Envelope": {
        "@_xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
        "@_s:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/",

        "s:Body": {
          [`u:${action}`]: {
            "@_xmlns:u": upnpService,

            ...actionArgs,
          },
        },
      },
    };

    // Include the CRLF so that it is calculated as part of the CONTENT-LENGTH
    return `${builder.build(body)}\r\n`;
  }

  return async function controlRequest<K extends keyof ControlRequests>(
    ...args: ControlRequestArgs<K>
  ) {
    const [action, data = {}] = args;

    output.debug(
      `control: invoking action="${action}" with data: ${JSON.stringify(data, null, 2)}`,
    );

    const body = createBody(action, data);

    const contentLength = Buffer.byteLength(body);
    const headers = Object.entries({
      HOST: host,
      "CONTENT-LENGTH": `${contentLength}`,
      "Accept-Ranges": "bytes",
      "CONTENT-TYPE": `text/xml; charset="utf-8"`,
      SOAPACTION: `"${upnpService}#${action}"`,
      "USER-AGENT": `marantz-model-m1-remote/1.0.0`,
    });

    const command = [
      `POST ${pathname} HTTP/1.1`,
      serializeHeaders(headers),
      "",
      body,
    ].join("\r\n");

    write(command);

    output.debug(`control: wrote command: ${command}`);
  };
}

export type ControlInstance = ReturnType<typeof control>;
