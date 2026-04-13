import type { PickDeep } from "type-fest";

import { ensureArray } from "./array.js";
import type { Device, Service, AiosDevice } from "./getAiosDevice.js";

type AiosDeviceMatchers = {
  device(device: Pick<Device, "friendlyName" | "modelName">): boolean;
  service(service: Pick<Service, "serviceType" | "serviceId">): boolean;
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
