import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";
import { XMLParser } from "fast-xml-parser";
import XMLBuilder from "fast-xml-builder";

import { createControlClient } from "./createControlClient";
import type { IOutput } from "./output";
import type { ISocket } from "./sockets";
import type { CreateClientArgs } from "./createEndpoint";

const parser = new XMLParser({ ignoreAttributes: false });
const builder = new XMLBuilder({ ignoreAttributes: false });

// Mock the env module
vi.mock("../env", () => ({
  upnpService: "urn:schemas-denon-com:service:ACT:1",
}));

const getAudioConfigRequestBody = `<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><s:Body><u:GetAudioConfig xmlns:u=\"urn:schemas-denon-com:service:ACT:1\"></u:GetAudioConfig></s:Body></s:Envelope>\r\n`;

const audioConfigResponseBody =
  `<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><s:Body>\n<u:GetAudioConfigResponse xmlns:u=\"urn:schemas-denon-com:service:ACT:1\">\r\n<AudioConfig>&lt;AudioConfig&gt;&lt;highpass&gt;80&lt;/highpass&gt;&lt;lowpass&gt;120&lt;/lowpass&gt;&lt;subwooferEnable&gt;1&lt;/subwooferEnable&gt;&lt;outputMode&gt;STEREO&lt;/outputMode&gt;&lt;ampBridged&gt;0&lt;/ampBridged&gt;&lt;soundMode&gt;STEREO&lt;/soundMode&gt;&lt;impedance&gt;&lt;/impedance&gt;&lt;ampPower&gt;1&lt;/ampPower&gt;&lt;availableSoundModes&gt;DIRECT,STEREO,VIRTUAL&lt;/availableSoundModes&gt;&lt;sourceDirect&gt;0&lt;/sourceDirect&gt;&lt;bassBoost&gt;0&lt;/bassBoost&gt;&lt;speakerOption&gt;NORMAL&lt;/speakerOption&gt;&lt;toneControlOption&gt;&lt;/toneControlOption&gt;&lt;tilt&gt;0&lt;/tilt&gt;&lt;digitalFilter&gt;FILTER_1&lt;/digitalFilter&gt;&lt;availableDigitalFilter&gt;FILTER_1,FILTER_2&lt;/availableDigitalFilter&gt;&lt;diracHistory&gt;1&lt;/diracHistory&gt;&lt;diracFilterList&gt;&lt;filter1&gt;Rhine&lt;/filter1&gt;&lt;/diracFilterList&gt;&lt;diracActiveFilter&gt;filter1&lt;/diracActiveFilter&gt;&lt;/AudioConfig&gt;</AudioConfig>\r\n</u:GetAudioConfigResponse>\r\n</s:Body> </s:Envelope>` as const;

describe("control", () => {
  it("GetAudioConfig", async () => {
    const emitter = new EventEmitter();

    const response = [
      `HTTP/1.1 200 OK`,
      `CONTENT-LENGTH: ${Buffer.byteLength(audioConfigResponseBody)}`,
      ``,
      audioConfigResponseBody,
    ].join("\r\n");

    const output = {
      log: vi.fn(),
      table: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    } satisfies IOutput;

    const socket = {
      on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
      off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
      connect: vi.fn((onConnect) => onConnect()),
      destroy: vi.fn(),
      write: vi.fn(() => emitter.emit("data", response)),
    } satisfies ISocket;

    const controlArgs = {
      host: "192.168.1.2",
      pathname: "/ACT/control",
      build: (data) => builder.build(data),
      parse: (data) => parser.parse(data),
      output,
      socket,
    } satisfies CreateClientArgs;

    const controlClient = createControlClient(controlArgs);

    const audioConfigResponse = await controlClient("GetAudioConfig");

    expect(socket.write).toHaveBeenCalledWith(
      [
        `POST ${controlArgs.pathname} HTTP/1.1`,
        `HOST: ${controlArgs.host}`,
        `CONTENT-LENGTH: ${Buffer.byteLength(getAudioConfigRequestBody)}`,
        `ACCEPT-RANGES: bytes`,
        `CONTENT-TYPE: text/xml; charset=\"utf-8\"`,
        `SOAPACTION: "urn:schemas-denon-com:service:ACT:1#GetAudioConfig"`,
        `USER-AGENT: marantz-model-m1-remote/1.0.0`,
        ``,
        getAudioConfigRequestBody,
      ].join("\r\n"),
    );

    const expectedAudioConfig = {
      highpass: 80,
      lowpass: 120,
      subwooferEnable: 1,
      outputMode: "STEREO",
      ampBridged: 0,
      soundMode: "STEREO",
      availableSoundModes: ["DIRECT", "STEREO", "VIRTUAL"],
      sourceDirect: 0,
      bassBoost: 0,
      speakerOption: "NORMAL",
      toneControlOption: "",
      tilt: 0,
      digitalFilter: "FILTER_1",
      availableDigitalFilter: ["FILTER_1", "FILTER_2"],
      diracHistory: 1,
      diracFilterList: {
        filter1: "Rhine",
      },
      diracActiveFilter: "filter1",
    };

    expect(audioConfigResponse).toEqual({
      "s:Envelope": {
        "s:Body": {
          "u:GetAudioConfigResponse": {
            AudioConfig: { AudioConfig: expectedAudioConfig },
          },
        },
      },
    });
  });
});
