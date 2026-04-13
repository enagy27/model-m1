import { describe, it, expect } from "vitest";
import { search } from "./upnp.js";

describe("upnp", () => {
  describe("search", () => {
    it("should send M-SEARCH message with correct format", () => {
      const message = search({
        host: "239.255.255.250:1900",
        service: "urn:schemas-denon-com:device:AiosDevice:1",
      });

      expect(message).toEqual(
        "M-SEARCH * HTTP/1.1\r\n" +
          "HOST: 239.255.255.250:1900\r\n" +
          'MAN: "ssdp:discover"\r\n' +
          "ST: urn:schemas-denon-com:device:AiosDevice:1\r\n" +
          "MX: 3\r\n" +
          "\r\n",
      );
    });
  });
});
