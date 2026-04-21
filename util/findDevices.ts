import type { PickDeep } from "type-fest";

import type { AiosDevice, Device, Service } from "./getAiosDevice.js";

import { ensureArray } from "./array.js";

type AiosDeviceMatchers = {
  device(device: Pick<Device, "friendlyName" | "modelName">): boolean;
  service(service: Pick<Service, "serviceId" | "serviceType">): boolean;
};

export function findDevices(
  aiosDevice: PickDeep<AiosDevice, "root.device.deviceList.device">,
  matchers: AiosDeviceMatchers,
): Device[] {
  const { deviceList } = aiosDevice.root.device;

  return ensureArray(deviceList.device)
    .filter(matchers.device)
    .map((device) => {
      const service = ensureArray(device.serviceList.service).filter(
        matchers.service,
      );

      if (service.length < 1) {
        return undefined;
      }

      return {
        ...device,
        serviceList: { service },
      };
    })
    .filter((device) => device != null);
}
