import { describe, it, expect } from "vitest";
import { findService } from "./findService";
import type { Service } from "./getAiosDevice";

const createMockService = (overrides: Partial<Service> = {}): Service => ({
  serviceType: "urn:schemas-denon-com:service:ACT:1",
  serviceId: "urn:denon-com:serviceId:ACT",
  SCPDURL: "/upnp/scpd/ACT/ACT.xml",
  controlURL: "/ACT/control",
  eventSubURL: "/ACT/event",
  ...overrides,
});

const createMockDevice = (
  friendlyName: string,
  modelName: string,
  services: Service[] = [createMockService()],
) => ({
  friendlyName,
  modelName,
  serviceList: { service: services },
});

const createMockAiosDevice = (
  devices: ReturnType<typeof createMockDevice>[],
) => ({
  root: {
    device: {
      friendlyName: "Root Device",
      modelName: "Root Model",
      deviceList: { device: devices },
    },
  },
});

describe("findService", () => {
  const defaultMatchers = {
    device: () => true,
    service: () => true,
  };

  describe("device matching", () => {
    it("should find service when device matches", () => {
      const device = createMockDevice("Family Room", "Marantz MODEL M1");
      const aiosDevice = createMockAiosDevice([device]);

      const result = findService(aiosDevice, {
        device: (d) => d.friendlyName === "Family Room",
        service: () => true,
      });

      expect(result).toEqual(createMockService());
    });

    it("should throw when no devices match", () => {
      const device = createMockDevice("Living Room", "Marantz MODEL M1");
      const aiosDevice = createMockAiosDevice([device]);

      expect(() =>
        findService(aiosDevice, {
          device: (d) => d.friendlyName === "Family Room",
          service: () => true,
        }),
      ).toThrow("Device not found");
    });

    it("should filter devices by modelName", () => {
      const devices = [
        createMockDevice("Room 1", "Other Model"),
        createMockDevice("Room 2", "Marantz MODEL M1"),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      const result = findService(aiosDevice, {
        device: (d) => d.modelName === "Marantz MODEL M1",
        service: () => true,
      });

      expect(result).toEqual(createMockService());
    });

    it("should handle multiple matching devices", () => {
      const service1 = createMockService({ controlURL: "/ACT1/control" });
      const service2 = createMockService({ controlURL: "/ACT2/control" });

      const devices = [
        createMockDevice("Room 1", "Marantz MODEL M1", [service1]),
        createMockDevice("Room 2", "Marantz MODEL M1", [service2]),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      // When multiple devices match, all their services are collected
      // If service matcher returns true for all, we get multiple services which throws
      expect(() =>
        findService(aiosDevice, {
          device: () => true,
          service: () => true,
        }),
      ).toThrow("Multiple control services for device found");
    });
  });

  describe("service matching", () => {
    it("should find service by serviceType", () => {
      const actService = createMockService({
        serviceType: "urn:schemas-denon-com:service:ACT:1",
      });

      const otherService = createMockService({
        serviceType: "urn:schemas-upnp-org:service:ContentDirectory:1",
        serviceId: "urn:upnp-org:serviceId:ContentDirectory",
      });

      const device = createMockDevice("Family Room", "Marantz MODEL M1", [
        actService,
        otherService,
      ]);

      const aiosDevice = createMockAiosDevice([device]);

      const result = findService(aiosDevice, {
        device: () => true,
        service: (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      });

      expect(result.serviceType).toBe("urn:schemas-denon-com:service:ACT:1");
      expect(result.controlURL).toBe("/ACT/control");
    });

    it("should throw when no services match", () => {
      const device = createMockDevice("Family Room", "Marantz MODEL M1", [
        createMockService({
          serviceType: "urn:schemas-upnp-org:service:ContentDirectory:1",
        }),
      ]);

      const aiosDevice = createMockAiosDevice([device]);

      expect(() =>
        findService(aiosDevice, {
          device: () => true,
          service: (s) =>
            s.serviceType === "urn:schemas-denon-com:service:ACT:1",
        }),
      ).toThrow("Control service for device not found");
    });

    it("should throw when multiple services match", () => {
      const device = createMockDevice("Family Room", "Marantz MODEL M1", [
        createMockService({ serviceId: "urn:denon-com:serviceId:ACT1" }),
        createMockService({ serviceId: "urn:denon-com:serviceId:ACT2" }),
      ]);

      const aiosDevice = createMockAiosDevice([device]);

      expect(() =>
        findService(aiosDevice, {
          device: () => true,
          service: () => true,
        }),
      ).toThrow("Multiple control services for device found");
    });

    it("should find service by serviceId", () => {
      const service = createMockService({
        serviceId: "urn:denon-com:serviceId:ACT",
      });

      const device = createMockDevice("Family Room", "Marantz MODEL M1", [
        service,
      ]);

      const aiosDevice = createMockAiosDevice([device]);

      const result = findService(aiosDevice, {
        device: () => true,
        service: (s) => s.serviceId === "urn:denon-com:serviceId:ACT",
      });

      expect(result.serviceId).toBe("urn:denon-com:serviceId:ACT");
    });
  });

  describe("combined matching", () => {
    it("should find service matching both device and service criteria", () => {
      const targetService = createMockService({
        controlURL: "/ACT/control",
        serviceType: "urn:schemas-denon-com:service:ACT:1",
      });

      const otherService = createMockService({
        controlURL: "/other/control",
        serviceType: "urn:other:service:1",
      });

      const devices = [
        createMockDevice("Family Room", "Marantz MODEL M1", [
          targetService,
          otherService,
        ]),
        createMockDevice("Kitchen", "Other Device", [otherService]),
      ];

      const aiosDevice = createMockAiosDevice(devices);

      const result = findService(aiosDevice, {
        device: (d) =>
          d.friendlyName === "Family Room" && d.modelName === "Marantz MODEL M1",
        service: (s) => s.serviceType === "urn:schemas-denon-com:service:ACT:1",
      });

      expect(result.controlURL).toBe("/ACT/control");
    });
  });
});
