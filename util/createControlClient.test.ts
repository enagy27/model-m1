import XMLBuilder from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import type { CreateClientArgs } from "./createEndpoint.js";
import type { IOutput } from "./output.js";
import type { ISocket } from "./sockets.js";

import { createControlClient } from "./createControlClient.js";

const parser = new XMLParser({ ignoreAttributes: false });
const builder = new XMLBuilder({ ignoreAttributes: false });

// Mock the env module
vi.mock("../env", () => ({
  upnpService: "urn:schemas-denon-com:service:ACT:1",
}));

const getAudioConfigRequestBody = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:GetAudioConfig xmlns:u="urn:schemas-denon-com:service:ACT:1"></u:GetAudioConfig></s:Body></s:Envelope>\r\n`;

const audioConfigResponseBody =
  `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>\n<u:GetAudioConfigResponse xmlns:u="urn:schemas-denon-com:service:ACT:1">\r\n<AudioConfig>&lt;AudioConfig&gt;&lt;highpass&gt;80&lt;/highpass&gt;&lt;lowpass&gt;120&lt;/lowpass&gt;&lt;subwooferEnable&gt;1&lt;/subwooferEnable&gt;&lt;outputMode&gt;STEREO&lt;/outputMode&gt;&lt;ampBridged&gt;0&lt;/ampBridged&gt;&lt;soundMode&gt;STEREO&lt;/soundMode&gt;&lt;impedance&gt;&lt;/impedance&gt;&lt;ampPower&gt;1&lt;/ampPower&gt;&lt;availableSoundModes&gt;DIRECT,STEREO,VIRTUAL&lt;/availableSoundModes&gt;&lt;sourceDirect&gt;0&lt;/sourceDirect&gt;&lt;bassBoost&gt;0&lt;/bassBoost&gt;&lt;speakerOption&gt;NORMAL&lt;/speakerOption&gt;&lt;toneControlOption&gt;&lt;/toneControlOption&gt;&lt;tilt&gt;0&lt;/tilt&gt;&lt;digitalFilter&gt;FILTER_1&lt;/digitalFilter&gt;&lt;availableDigitalFilter&gt;FILTER_1,FILTER_2&lt;/availableDigitalFilter&gt;&lt;diracHistory&gt;1&lt;/diracHistory&gt;&lt;diracFilterList&gt;&lt;filter1&gt;Rhine&lt;/filter1&gt;&lt;/diracFilterList&gt;&lt;diracActiveFilter&gt;filter1&lt;/diracActiveFilter&gt;&lt;/AudioConfig&gt;</AudioConfig>\r\n</u:GetAudioConfigResponse>\r\n</s:Body> </s:Envelope>` as const;

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
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      table: vi.fn(),
    } satisfies IOutput;

    const socket = {
      connect: vi.fn((onConnect) => onConnect()),
      destroy: vi.fn(),
      off: vi.fn((eventName, cb) => emitter.off(eventName, cb)),
      on: vi.fn((eventName, cb) => emitter.on(eventName, cb)),
      write: vi.fn(() => emitter.emit("data", response)),
    } satisfies ISocket;

    const controlArgs = {
      build: (data) => builder.build(data),
      host: "192.168.1.2",
      output,
      parse: (data) => parser.parse(data),
      pathname: "/ACT/control",
      socket,
    } satisfies CreateClientArgs;

    const controlClient = createControlClient(controlArgs);

    const audioConfigResponse = await controlClient("GetAudioConfig");

    expect(socket.write).toHaveBeenCalledWith(
      [
        `POST ${controlArgs.pathname} HTTP/1.1`,
        `ACCEPT-RANGES: bytes`,
        `CONTENT-LENGTH: ${Buffer.byteLength(getAudioConfigRequestBody)}`,
        `CONTENT-TYPE: text/xml; charset="utf-8"`,
        `HOST: ${controlArgs.host}`,
        `SOAPACTION: "urn:schemas-denon-com:service:ACT:1#GetAudioConfig"`,
        `USER-AGENT: model-m1/2.1.0`,
        ``,
        getAudioConfigRequestBody,
      ].join("\r\n"),
    );

    const expectedAudioConfig = {
      ampBridged: 0,
      availableDigitalFilter: ["FILTER_1", "FILTER_2"],
      availableSoundModes: ["DIRECT", "STEREO", "VIRTUAL"],
      bassBoost: 0,
      digitalFilter: "FILTER_1",
      diracActiveFilter: "filter1",
      diracFilterList: {
        filter1: "Rhine",
      },
      diracHistory: 1,
      highpass: 80,
      lowpass: 120,
      outputMode: "STEREO",
      soundMode: "STEREO",
      sourceDirect: 0,
      speakerOption: "NORMAL",
      subwooferEnable: 1,
      tilt: 0,
      toneControlOption: "",
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
