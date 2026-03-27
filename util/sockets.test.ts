import { describe, it, expect, vi } from "vitest";
import * as sockets from "./sockets";

describe("sockets", () => {
  describe("response", () => {
    it("should parse successful HTTP response", () => {
      const response = [
        "HTTP/1.1 200 OK",
        "CACHE-CONTROL: max-age=1800",
        "LOCATION: http://192.168.4.55:60006/upnp/desc/aios_device/aios_device.xml",
        "ST: urn:schemas-denon-com:device:AiosDevice:1",
        "USN: uuid:4fcb4544-07dd-133d-0080-000678fb9572::urn:schemas-denon-com:device:AiosDevice:1",
        "",
      ].join("\r\n");

      const result = sockets.response(response);

      expect(result).toEqual({
        statusCode: 200,
        headers: {
          "CACHE-CONTROL": "max-age=1800",
          LOCATION:
            "http://192.168.4.55:60006/upnp/desc/aios_device/aios_device.xml",
          ST: "urn:schemas-denon-com:device:AiosDevice:1",
          USN: "uuid:4fcb4544-07dd-133d-0080-000678fb9572::urn:schemas-denon-com:device:AiosDevice:1",
        },
      });
    });

    it("should return success false for non-200 response", () => {
      const response = ["HTTP/1.1 404 Not Found", ""].join("\r\n");

      const result = sockets.response(response);

      expect(result).toEqual({ statusCode: 404, headers: {} });
    });

    it("should handle header values containing colons", () => {
      const response = [
        "HTTP/1.1 200 OK",
        "LOCATION: http://192.168.4.55:60006/device.xml",
        "",
      ].join("\r\n");

      const result = sockets.response(response);

      expect(result).toEqual({
        statusCode: 200,
        headers: {
          LOCATION: "http://192.168.4.55:60006/device.xml",
        },
      });
    });

    it("should normalize header names to uppercase", () => {
      const response = [
        "HTTP/1.1 200 OK",
        "Cache-Control: max-age=1800",
        "location: http://example.com/device.xml",
        "",
      ].join("\r\n");

      const result = sockets.response(response);

      expect(result).toEqual({
        statusCode: 200,
        headers: {
          "CACHE-CONTROL": "max-age=1800",
          LOCATION: "http://example.com/device.xml",
        },
      });
    });

    it("should trim whitespace from header values", () => {
      const response = [
        "HTTP/1.1 200 OK",
        "ST:   urn:schemas-upnp-org:device:Basic:1  ",
        "",
      ].join("\r\n");

      const result = sockets.response(response);

      expect(result).toEqual({
        statusCode: 200,
        headers: {
          ST: "urn:schemas-upnp-org:device:Basic:1",
        },
      });
    });

    it("should skip malformed header lines", () => {
      const response = [
        "HTTP/1.1 200 OK",
        "VALID-HEADER: value",
        "malformed line without colon",
        "ANOTHER-HEADER: another value",
        "",
      ].join("\r\n");

      const result = sockets.response(response);

      expect(result).toEqual({
        statusCode: 200,
        headers: {
          "VALID-HEADER": "value",
          "ANOTHER-HEADER": "another value",
        },
      });
    });

    it("should handle empty response body", () => {
      const response = "HTTP/1.1 200 OK\r\n";

      const result = sockets.response(response);

      expect(result).toEqual({ statusCode: 200, headers: {} });
    });

    it("should parse real-world SSDP discovery response", () => {
      const response = [
        "HTTP/1.1 200 OK",
        "CACHE-CONTROL: max-age=1800",
        "EXT:",
        "LOCATION: http://192.168.4.55:60006/upnp/desc/aios_device/aios_device.xml",
        "SERVER: Linux/4.9.61, UPnP/1.0, HEOS/1.0",
        "ST: urn:schemas-denon-com:device:AiosDevice:1",
        "USN: uuid:4fcb4544-07dd-133d-0080-000678fb9572::urn:schemas-denon-com:device:AiosDevice:1",
        "",
      ].join("\r\n");

      const result = sockets.response(response);

      expect(result.statusCode).toEqual(200);

      expect(result.headers.LOCATION).toBe(
        "http://192.168.4.55:60006/upnp/desc/aios_device/aios_device.xml",
      );
      expect(result.headers.ST).toBe(
        "urn:schemas-denon-com:device:AiosDevice:1",
      );
      expect(result.headers.SERVER).toBe("Linux/4.9.61, UPnP/1.0, HEOS/1.0");
    });
  });
});
