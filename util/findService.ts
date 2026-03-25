import type { PickDeep } from "type-fest";

import { ensureArray } from "./array";
import { Device, Service, type AiosDevice } from "./getAiosDevice";

type AiosDeviceMatchers = {
  device(device: Pick<Device, "friendlyName" | "modelName">): boolean;
  service(service: Pick<Service, "serviceType" | "serviceId">): boolean;
};

export function findService(
  aiosDevice: PickDeep<AiosDevice, "root.device.deviceList.device">,
  matchers: AiosDeviceMatchers,
): Service {
  const { deviceList } = aiosDevice.root.device;
  const devices = ensureArray(deviceList.device).filter(matchers.device);

  if (devices.length < 1) {
    throw new Error(`Device not found`);
  }

  const deviceControlServices = devices
    .flatMap((device) => ensureArray(device.serviceList.service))
    .filter(matchers.service);

  if (deviceControlServices.length < 1) {
    throw new Error(`Control service for device not found`);
  }

  if (deviceControlServices.length > 1) {
    throw new Error(`Multiple control services for device found`);
  }

  const [deviceControlService] = deviceControlServices;
  return deviceControlService;
}
