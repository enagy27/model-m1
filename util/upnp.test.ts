import { describe, it, expect, vi } from "vitest";
import { upnp } from "./upnp";

describe("upnp", () => {
  describe("search", () => {
    it("should send M-SEARCH message with correct format", () => {
      const send = vi.fn();
      const { search } = upnp({ host: "239.255.255.250:1900", send });

      search("urn:schemas-denon-com:device:AiosDevice:1");

      expect(send).toHaveBeenCalledWith(
        "M-SEARCH * HTTP/1.1\r\n" +
          "HOST: 239.255.255.250:1900\r\n" +
          'MAN: "ssdp:discover"\r\n' +
          "ST: urn:schemas-denon-com:device:AiosDevice:1\r\n" +
          "MX: 3\r\n" +
          "\r\n",
      );
    });

    it("should use provided host in message", () => {
      const send = vi.fn();
      const { search } = upnp({ host: "192.168.1.1:8080", send });

      search("upnp:rootdevice");

      expect(send).toHaveBeenCalledWith(
        expect.stringContaining("HOST: 192.168.1.1:8080"),
      );
    });

    it("should include service type in ST header", () => {
      const send = vi.fn();
      const { search } = upnp({ host: "239.255.255.250:1900", send });

      search("ssdp:all");

      expect(send).toHaveBeenCalledWith(
        expect.stringContaining("ST: ssdp:all"),
      );
    });
  });

  describe("parseResponse", () => {
    it("should parse successful HTTP response", () => {
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

      const response = [
        "HTTP/1.1 200 OK",
        "CACHE-CONTROL: max-age=1800",
        "LOCATION: http://192.168.4.55:60006/upnp/desc/aios_device/aios_device.xml",
        "ST: urn:schemas-denon-com:device:AiosDevice:1",
        "USN: uuid:4fcb4544-07dd-133d-0080-000678fb9572::urn:schemas-denon-com:device:AiosDevice:1",
        "",
      ].join("\r\n");

      const result = parseResponse(response);

      expect(result).toEqual({
        success: true,
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
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

      const response = "HTTP/1.1 404 Not Found\r\n\r\n";

      const result = parseResponse(response);

      expect(result).toEqual({ success: false });
    });

    it("should handle header values containing colons", () => {
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

      const response = [
        "HTTP/1.1 200 OK",
        "LOCATION: http://192.168.4.55:60006/device.xml",
        "",
      ].join("\r\n");

      const result = parseResponse(response);

      expect(result).toEqual({
        success: true,
        headers: {
          LOCATION: "http://192.168.4.55:60006/device.xml",
        },
      });
    });

    it("should normalize header names to uppercase", () => {
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

      const response = [
        "HTTP/1.1 200 OK",
        "Cache-Control: max-age=1800",
        "location: http://example.com/device.xml",
        "",
      ].join("\r\n");

      const result = parseResponse(response);

      expect(result).toEqual({
        success: true,
        headers: {
          "CACHE-CONTROL": "max-age=1800",
          LOCATION: "http://example.com/device.xml",
        },
      });
    });

    it("should trim whitespace from header values", () => {
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

      const response = [
        "HTTP/1.1 200 OK",
        "ST:   urn:schemas-upnp-org:device:Basic:1  ",
        "",
      ].join("\r\n");

      const result = parseResponse(response);

      expect(result).toEqual({
        success: true,
        headers: {
          ST: "urn:schemas-upnp-org:device:Basic:1",
        },
      });
    });

    it("should skip malformed header lines", () => {
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

      const response = [
        "HTTP/1.1 200 OK",
        "VALID-HEADER: value",
        "malformed line without colon",
        "ANOTHER-HEADER: another value",
        "",
      ].join("\r\n");

      const result = parseResponse(response);

      expect(result).toEqual({
        success: true,
        headers: {
          "VALID-HEADER": "value",
          "ANOTHER-HEADER": "another value",
        },
      });
    });

    it("should handle empty response body", () => {
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

      const response = "HTTP/1.1 200 OK\r\n";

      const result = parseResponse(response);

      expect(result).toEqual({
        success: true,
        headers: {},
      });
    });

    it("should parse real-world SSDP discovery response", () => {
      const send = vi.fn();
      const { parseResponse } = upnp({ host: "239.255.255.250:1900", send });

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

      const result = parseResponse(response);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

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
