import { describe, it, expect } from "vitest";
import { findDevices } from "./findDevices.js";
import type { AiosDevice, Device, Service } from "./getAiosDevice.js";

function createMockService(overrides: Partial<Service> = {}): Service {
  return {
    serviceType: "urn:schemas-denon-com:service:ACT:1",
    serviceId: "urn:denon-com:serviceId:ACT",
    SCPDURL: "/upnp/scpd/ACT/ACT.xml",
    controlURL: "/ACT/control",
    eventSubURL: "/ACT/event",
    ...overrides,
  };
}

type CreateMockDeviceArgs = {
  friendlyName: string;
  modelName: string;
  services: Service[];
};

function createMockDevice({
  friendlyName,
  modelName,
  services,
}: CreateMockDeviceArgs) {
  return {
    friendlyName,
    modelName,
    serviceList: { service: services },
  };
}

function createMockAiosDevice(devices: Device[]): AiosDevice {
  const device = {
    friendlyName: "Root Device",
    modelName: "Root Model",
    deviceList: { device: devices },
  };

  return { root: { device } };
}

describe("findDevices", () => {
  describe("device matching", () => {
    it("should return devices that match the device matcher", () => {
      const device = createMockDevice({
        friendlyName: "Family Room",
        modelName: "Marantz MODEL M1",
        services: [createMockService()],
      });

      const aiosDevice = createMockAiosDevice([device]);

      const result = findDevices(aiosDevice, {
        device: (d) => d.friendlyName === "Family Room",
        service: () => true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].friendlyName).toBe("Family Room");
    });

    it("should return empty array when no devices match", () => {
      const device = createMockDevice({
        friendlyName: "Living Room",
        modelName: "Marantz MODEL M1",
        services: [createMockService()],
      });

      const aiosDevice = createMockAiosDevice([device]);

      const result = findDevices(aiosDevice, {
        device: (d) => d.friendlyName === "Family Room",
        service: () => true,
      });

      expect(result).toHaveLength(0);
    });

    it("should filter devices by modelName", () => {
      const devices = [
        createMockDevice({
          friendlyName: "Room 1",
          modelName: "Other Model",
          services: [createMockService()],
        }),
        createMockDevice({
          friendlyName: "Room 2",
          modelName: "Marantz MODEL M1",
          services: [createMockService()],
        }),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      const result = findDevices(aiosDevice, {
        device: (d) => d.modelName === "Marantz MODEL M1",
        service: () => true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].friendlyName).toBe("Room 2");
    });

    it("should return multiple matching devices", () => {
      const service1 = createMockService({ controlURL: "/ACT1/control" });
      const service2 = createMockService({ controlURL: "/ACT2/control" });

      const devices = [
        createMockDevice({
          friendlyName: "Room 1",
          modelName: "Marantz MODEL M1",
          services: [service1],
        }),
        createMockDevice({
          friendlyName: "Room 2",
          modelName: "Marantz MODEL M1",
          services: [service2],
        }),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      const result = findDevices(aiosDevice, {
        device: () => true,
        service: () => true,
      });

      expect(result).toHaveLength(2);
      expect(result[0].friendlyName).toBe("Room 1");
      expect(result[1].friendlyName).toBe("Room 2");
    });
  });

  describe("service matching", () => {
    it("should include device only if it has a matching service", () => {
      const actService = createMockService({
        serviceType: "urn:schemas-denon-com:service:ACT:1",
      });

      const otherService = createMockService({
        serviceType: "urn:schemas-upnp-org:service:ContentDirectory:1",
        serviceId: "urn:upnp-org:serviceId:ContentDirectory",
      });

      const device = createMockDevice({
        friendlyName: "Family Room",
        modelName: "Marantz MODEL M1",
        services: [actService, otherService],
      });

      const aiosDevice = createMockAiosDevice([device]);

      const result = findDevices(aiosDevice, {
        device: () => true,
        service: (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      });

      expect(result).toHaveLength(1);
      expect(result[0].friendlyName).toBe("Family Room");
    });

    it("should exclude device when no services match", () => {
      const device = createMockDevice({
        friendlyName: "Family Room",
        modelName: "Marantz MODEL M1",
        services: [
          createMockService({
            serviceType: "urn:schemas-upnp-org:service:ContentDirectory:1",
          }),
        ],
      });

      const aiosDevice = createMockAiosDevice([device]);

      const result = findDevices(aiosDevice, {
        device: () => true,
        service: (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      });

      expect(result).toHaveLength(0);
    });

    it("should match device when any service matches", () => {
      const device = createMockDevice({
        friendlyName: "Family Room",
        modelName: "Marantz MODEL M1",
        services: [
          createMockService({ serviceId: "urn:denon-com:serviceId:ACT1" }),
          createMockService({ serviceId: "urn:denon-com:serviceId:ACT2" }),
        ],
      });

      const aiosDevice = createMockAiosDevice([device]);

      const result = findDevices(aiosDevice, {
        device: () => true,
        service: (s) => s.serviceId === "urn:denon-com:serviceId:ACT2",
      });

      expect(result).toHaveLength(1);
      expect(result[0].friendlyName).toBe("Family Room");
    });

    it("should match by serviceId", () => {
      const service = createMockService({
        serviceId: "urn:denon-com:serviceId:ACT",
      });

      const device = createMockDevice({
        friendlyName: "Family Room",
        modelName: "Marantz MODEL M1",
        services: [service],
      });

      const aiosDevice = createMockAiosDevice([device]);

      const result = findDevices(aiosDevice, {
        device: () => true,
        service: (s) => s.serviceId === "urn:denon-com:serviceId:ACT",
      });

      expect(result).toHaveLength(1);
      expect(result[0].serviceList.service).toContainEqual(
        expect.objectContaining({ serviceId: "urn:denon-com:serviceId:ACT" }),
      );
    });
  });

  describe("combined matching", () => {
    it("should find devices matching both device and service criteria", () => {
      const targetService = createMockService({
        controlURL: "/ACT/control",
        serviceType: "urn:schemas-denon-com:service:ACT:1",
      });

      const otherService = createMockService({
        controlURL: "/other/control",
        serviceType: "urn:other:service:1",
      });

      const devices = [
        createMockDevice({
          friendlyName: "Family Room",
          modelName: "Marantz MODEL M1",
          services: [targetService, otherService],
        }),
        createMockDevice({
          friendlyName: "Kitchen",
          modelName: "Other Device",
          services: [otherService],
        }),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      const result = findDevices(aiosDevice, {
        device: (d) =>
          d.friendlyName === "Family Room" &&
          d.modelName === "Marantz MODEL M1",
        service: (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      });

      expect(result).toHaveLength(1);
      expect(result[0].friendlyName).toBe("Family Room");
    });

    it("should return empty when device matches but service does not", () => {
      const otherService = createMockService({
        serviceType: "urn:other:service:1",
      });

      const devices = [
        createMockDevice({
          friendlyName: "Family Room",
          modelName: "Marantz MODEL M1",
          services: [otherService],
        }),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      const result = findDevices(aiosDevice, {
        device: (d) => d.friendlyName === "Family Room",
        service: (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      });

      expect(result).toHaveLength(0);
    });

    it("should return empty when service matches but device does not", () => {
      const actService = createMockService({
        serviceType: "urn:schemas-denon-com:service:ACT:1",
      });

      const devices = [
        createMockDevice({
          friendlyName: "Kitchen",
          modelName: "Other Device",
          services: [actService],
        }),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      const result = findDevices(aiosDevice, {
        device: (d) => d.friendlyName === "Family Room",
        service: (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      });

      expect(result).toHaveLength(0);
    });
  });
});
