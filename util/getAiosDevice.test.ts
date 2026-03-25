import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { getAiosDevice } from "./getAiosDevice";

const aiosDeviceXml = readFileSync(
  join(import.meta.dirname, "__fixtures__/aiosDevice.xml"),
  "utf-8",
);

describe("getAiosDevice", () => {
  beforeEach(() => {
    const fetchStub = vi.fn(async () => ({ text: async () => aiosDeviceXml }));

    vi.stubGlobal("fetch", fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should parse root device properties", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");

    expect(result.root.device.friendlyName).toBe("Family Room");
    expect(result.root.device.modelName).toBe("Marantz MODEL M1");
  });

  it("should parse all nested devices", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;

    expect(devices).toHaveLength(4);
  });

  it("should parse MediaRenderer device with multiple services", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;

    const mediaRenderer = devices.find(
      (d) =>
        d.friendlyName === "Family Room" && d.modelName === "Marantz MODEL M1",
    );

    expect(mediaRenderer).toBeDefined();
    expect(mediaRenderer!.serviceList.service.length).toBeGreaterThanOrEqual(4);
  });

  it("should parse AiosServices device", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;

    const aiosServices = devices.find((d) => d.friendlyName === "AiosServices");

    expect(aiosServices).toBeDefined();
    expect(aiosServices!.modelName).toBe("Marantz MODEL M1");
    expect(aiosServices!.serviceList.service).toHaveLength(3);
  });

  it("should parse ACT service correctly", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;

    // Find the ACT device (last one in the list)
    const actDevice = devices.find((d) =>
      d.serviceList.service.some(
        (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      ),
    );

    expect(actDevice).toBeDefined();

    const actService = actDevice!.serviceList.service.find(
      (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
    );

    expect(actService).toEqual({
      serviceType: "urn:schemas-denon-com:service:ACT:1",
      serviceId: "urn:denon-com:serviceId:ACT",
      SCPDURL: "/ACT/SCPD.xml",
      controlURL: "/ACT/control",
      eventSubURL: "/ACT/event",
    });
  });

  it("should parse service properties correctly", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;
    const [firstDevice] = devices;
    const [firstService] = firstDevice.serviceList.service;

    expect(firstService).toEqual({
      serviceType: "urn:schemas-upnp-org:service:AVTransport:1",
      serviceId: "urn:upnp-org:serviceId:AVTransport",
      SCPDURL: "/upnp/scpd/renderer_dvc/AVTransport.xml",
      controlURL: "/upnp/control/renderer_dvc/AVTransport",
      eventSubURL: "/upnp/event/renderer_dvc/AVTransport",
    });
  });

  it("should handle device with single service (ACT device)", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;

    // ACT device has only one service
    const actDevice = devices.find((d) =>
      d.serviceList.service.some(
        (s) => s.serviceId === "urn:denon-com:serviceId:ACT",
      ),
    );

    expect(actDevice).toBeDefined();
    // Should still be an array even with single service
    expect(Array.isArray(actDevice!.serviceList.service)).toBe(true);
    expect(actDevice!.serviceList.service).toHaveLength(1);
  });

  it("should find ZoneControl service", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;

    const aiosServices = devices.find((d) => d.friendlyName === "AiosServices");
    const zoneControl = aiosServices!.serviceList.service.find(
      (s) => s.serviceType === "urn:schemas-denon-com:service:ZoneControl:2",
    );

    expect(zoneControl).toEqual({
      serviceType: "urn:schemas-denon-com:service:ZoneControl:2",
      serviceId: "urn:denon-com:serviceId:ZoneControl",
      SCPDURL: "/upnp/scpd/AiosServicesDvc/ZoneControl.xml",
      controlURL: "/upnp/control/AiosServicesDvc/ZoneControl",
      eventSubURL: "/upnp/event/AiosServicesDvc/ZoneControl",
    });
  });

  it("should find ContentDirectory service in MediaServer device", async () => {
    const result = await getAiosDevice("http://example.com/device.xml");
    const devices = result.root.device.deviceList.device;

    const mediaServer = devices.find((d) =>
      d.serviceList.service.some(
        (s) =>
          s.serviceType === "urn:schemas-upnp-org:service:ContentDirectory:1",
      ),
    );

    expect(mediaServer).toBeDefined();
    expect(mediaServer!.serviceList.service).toHaveLength(2);

    const contentDirectory = mediaServer!.serviceList.service.find(
      (s) =>
        s.serviceType === "urn:schemas-upnp-org:service:ContentDirectory:1",
    );

    expect(contentDirectory!.controlURL).toBe(
      "/upnp/control/ams_dvc/ContentDirectory",
    );
  });
});
