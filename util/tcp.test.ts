import { describe, expect, it } from "vitest";

import { serializeHeaders } from "./tcp.js";

describe("serializeHeaders", () => {
  it("should serialize a single header", () => {
    const headers = [["Content-Type", "text/xml"]] as const;

    expect(serializeHeaders(headers)).toBe("Content-Type: text/xml");
  });

  it("should serialize multiple headers with CRLF separators", () => {
    const headers = [
      ["Content-Type", "text/xml"],
      ["Content-Length", "123"],
    ] as const;

    expect(serializeHeaders(headers)).toBe(
      "Content-Type: text/xml\r\nContent-Length: 123",
    );
  });

  it("should handle empty headers array", () => {
    const headers = [] as const;

    expect(serializeHeaders(headers)).toBe("");
  });

  it("should preserve header value with special characters", () => {
    const headers = [
      ["SOAPACTION", '"urn:schemas-denon-com:service:ACT:1#GetVolume"'],
    ] as const;

    expect(serializeHeaders(headers)).toBe(
      'SOAPACTION: "urn:schemas-denon-com:service:ACT:1#GetVolume"',
    );
  });

  it("should handle headers with empty values", () => {
    const headers = [["X-Custom-Header", ""]] as const;

    expect(serializeHeaders(headers)).toBe("X-Custom-Header: ");
  });

  it("should serialize typical SOAP request headers", () => {
    const headers = [
      ["HOST", "192.168.4.55:60006"],
      ["CONTENT-TYPE", 'text/xml; charset="utf-8"'],
      ["CONTENT-LENGTH", "456"],
      ["SOAPACTION", '"urn:schemas-denon-com:service:ACT:1#GetVolume"'],
    ] as const;

    expect(serializeHeaders(headers)).toBe(
      "HOST: 192.168.4.55:60006\r\n" +
        'CONTENT-TYPE: text/xml; charset="utf-8"\r\n' +
        "CONTENT-LENGTH: 456\r\n" +
        'SOAPACTION: "urn:schemas-denon-com:service:ACT:1#GetVolume"',
    );
  });
});
