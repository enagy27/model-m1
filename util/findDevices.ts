import type { PickDeep } from "type-fest";

import { ensureArray } from "./array";
import { Device, Service, type AiosDevice } from "./getAiosDevice";

type AiosDeviceMatchers = {
  device(device: Pick<Device, "friendlyName" | "modelName">): boolean;
  service(service: Pick<Service, "serviceType" | "serviceId">): boolean;
};

export function findDevices(
  aiosDevice: PickDeep<AiosDevice, "root.device.deviceList.device">,
  matchers: AiosDeviceMatchers,
): Device[] {
  const { deviceList } = aiosDevice.root.device;

  return ensureArray(deviceList.device).filter((device) => {
    if (!matchers.device(device)) {
      return false;
    }

    const services = ensureArray(device.serviceList.service);
    return services.some(matchers.service);
  });
}
