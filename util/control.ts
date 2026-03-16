import XMLBuilder from "fast-xml-builder";
import { serializeHeaders } from "./tcp";

// Reference:
//
// <AudioConfig>
//   <highpass>80</highpass>
//   <lowpass>120</lowpass>
//   <subwooferEnable>1</subwooferEnable>
//   <outputMode>STEREO</outputMode>
//   <ampBridged>0</ampBridged>
//   <soundMode>STEREO</soundMode>
//   <impedance></impedance>
//   <ampPower>1</ampPower>
//   <availableSoundModes>DIRECT,STEREO,VIRTUAL</availableSoundModes>
//   <sourceDirect>0</sourceDirect>
//   <bassBoost>0</bassBoost>
//   <speakerOption>NORMAL</speakerOption>
//   <toneControlOption></toneControlOption>
//   <tilt>0</tilt>
//   <digitalFilter>FILTER_1</digitalFilter>
//   <availableDigitalFilter>FILTER_1,FILTER_2</availableDigitalFilter>
//   <diracHistory>0</diracHistory>
// </AudioConfig>

type ISocket = {
  readonly host: string;
  write(message: string): void;
};

type AudioConfig = {
  digitalFilter: "FILTER_1" | "FILTER_2";
  lowpass: 40 | 60 | 80 | 100 | 110 | 120;
};

type ControlRequests = {
  GetAudioConfig: {};
  SetAudioConfig: {
    AudioConfig: { AudioConfig: Partial<AudioConfig> };
  };
};

export function control(socket: ISocket) {
  const builder = new XMLBuilder({ ignoreAttributes: false });

  function createBody<K extends keyof ControlRequests>(
    action: K,
    data: ControlRequests[K],
  ) {
    const args = Object.fromEntries(
      Object.entries(data).map(
        ([argName, value]) => [argName, builder.build(value)] as const,
      ),
    );

    const body = builder.build({
      "s:Envelope": {
        "@_xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
        "@_s:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/",

        "s:Body": {
          [`u:${action}`]: {
            "@_xmlns:u": "urn:schemas-denon-com:service:ACT:1",

            ...args,
          },
        },
      },
    });

    return `${body}\r\n`;
  }

  return async function controlRequest<K extends keyof ControlRequests>(
    action: K,
    data: ControlRequests[K],
  ) {
    const body = createBody(action, data);

    const contentLength = Buffer.byteLength(body);
    const headers = Object.entries({
      HOST: socket.host,
      "CONTENT-LENGTH": `${contentLength}`,
      "Accept-Ranges": "bytes",
      "CONTENT-TYPE": `text/xml; charset="utf-8"`,
      SOAPACTION: `"urn:schemas-denon-com:service:ACT:1#${action}"`,
      "USER-AGENT": `LINUX UPnP/1.0 Denon-Heos/1dcbe52d2ca0d06c05ba328fca782ca3dbd262e6`,
    });

    const command = [
      "POST /ACT/control HTTP/1.1",
      serializeHeaders(headers),
      "",
      body,
    ].join("\r\n");

    socket.write(command);
  };
}

export type ControlInstance = ReturnType<typeof control>;
