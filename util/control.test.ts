import { describe, it, expect, vi } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { control } from "./control";

// Mock the env module
vi.mock("../env", () => ({
  upnpService: "urn:schemas-denon-com:service:ACT:1",
}));

type ControlRequestData = {
  /** e.g. POST */
  method: string;
  /** @example /ACT/control */
  pathname: string;
  /** @example HTTP/1.1 */
  protocol: string;
  headers: Record<string, string>;
  body: string;
};

function parseRequest(request: string): ControlRequestData {
  const [head, body] = request.split("\r\n\r\n");
  const [methodPathnameProtocolLine, ...headerLines] = head.split("\r\n");

  const [method, pathname, protocol] = methodPathnameProtocolLine.split(" ");
  const headers = Object.fromEntries(
    headerLines.map((headerLine) => {
      const [name, ...valueParts] = headerLine.split(": ");

      return [name, valueParts.join(": ")] as const;
    }),
  );

  return { method, pathname, protocol, headers, body };
}

describe("control", () => {
  const bodyParser = new XMLParser({ ignoreAttributes: false });

  const createMockSocket = () => {
    const written = new Array<string>();

    return {
      host: "192.168.4.55:60006",
      pathname: "/ACT/control",
      write: (message: string) => written.push(message),
      output: { log: vi.fn(), error: vi.fn() },
      getWritten: () => written,
    };
  };

  describe("controlRequest", () => {
    it("should structure a basic Get request", async () => {
      const mockSocket = createMockSocket();
      const controlRequest = control(mockSocket);

      await controlRequest("GetAudioConfig");

      const written = mockSocket.getWritten();
      expect(written).toHaveLength(1);

      const [request] = written;
      const { method, pathname, protocol, headers, body } =
        parseRequest(request);

      expect(method).toEqual("POST");
      expect(pathname).toEqual("/ACT/control");
      expect(protocol).toEqual("HTTP/1.1");

      expect(headers).toEqual({
        HOST: "192.168.4.55:60006",
        "CONTENT-TYPE": `text/xml; charset="utf-8"`,
        "CONTENT-LENGTH": `${Buffer.byteLength(body)}`,
        SOAPACTION: `"urn:schemas-denon-com:service:ACT:1#GetAudioConfig"`,
        "USER-AGENT": "marantz-model-m1-remote/1.0.0",
        "Accept-Ranges": "bytes",
      });

      expect(bodyParser.parse(body)).toEqual({
        "s:Envelope": {
          "@_s:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/",
          "@_xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
          "s:Body": {
            "u:GetAudioConfig": {
              "@_xmlns:u": "urn:schemas-denon-com:service:ACT:1",
            },
          },
        },
      });

      // Body should end with CRLF
      expect(body.slice(-2)).toEqual("\r\n");
    });

    it("should structure a basic Set request", async () => {
      const mockSocket = createMockSocket();
      const controlRequest = control(mockSocket);

      await controlRequest("SetAudioConfig", {
        AudioConfig: {
          AudioConfig: {
            lowpass: 120,
            highpass: 80,
            subwooferEnable: 1,
            digitalFilter: "FILTER_1",
            bassBoost: 11,
            outputMode: "STEREO",
          },
        },
      });

      const written = mockSocket.getWritten();
      expect(written).toHaveLength(1);

      const [request] = written;
      const { method, pathname, protocol, headers, body } =
        parseRequest(request);

      expect(method).toEqual("POST");
      expect(pathname).toEqual("/ACT/control");
      expect(protocol).toEqual("HTTP/1.1");

      expect(headers).toEqual({
        HOST: "192.168.4.55:60006",
        "CONTENT-TYPE": `text/xml; charset="utf-8"`,
        "CONTENT-LENGTH": `${Buffer.byteLength(body)}`,
        SOAPACTION: `"urn:schemas-denon-com:service:ACT:1#SetAudioConfig"`,
        "USER-AGENT": "marantz-model-m1-remote/1.0.0",
        "Accept-Ranges": "bytes",
      });

      const audioConfigXml =
        "<AudioConfig><lowpass>120</lowpass><highpass>80</highpass><subwooferEnable>1</subwooferEnable><digitalFilter>FILTER_1</digitalFilter><bassBoost>11</bassBoost><outputMode>STEREO</outputMode></AudioConfig>";

      expect(bodyParser.parse(body)).toEqual({
        "s:Envelope": {
          "@_s:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/",
          "@_xmlns:s": "http://schemas.xmlsoap.org/soap/envelope/",
          "s:Body": {
            "u:SetAudioConfig": {
              "@_xmlns:u": "urn:schemas-denon-com:service:ACT:1",
              AudioConfig: expect.stringContaining(audioConfigXml),
            },
          },
        },
      });

      // Ensure that the XML value is encoded
      expect(body).toContain(
        audioConfigXml.replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
      );

      // Body should end with CRLF
      expect(body.slice(-2)).toEqual("\r\n");
    });
  });
});
