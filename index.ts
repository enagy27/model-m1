#!/usr/bin/env node

import net from "net";
import { awaitAtMost } from "./util/async";
import { getServiceDeviceDescriptorUrl } from "./util/getServiceDeviceDescriptorUrl";
import { getAiosDevice } from "./util/getAiosDevice";
import { findService } from "./util/findService";
import { control } from "./util/control";
import { upnpService } from "./env";

type MainArgs = {
  deviceFriendlyName: string;
};

async function main({ deviceFriendlyName }: MainArgs) {
  const timeout = 5_000;

  const location = await awaitAtMost(getServiceDeviceDescriptorUrl(upnpService), timeout);
  const aiosDevice = await awaitAtMost(getAiosDevice(location), timeout);

  const deviceControlService = findService(aiosDevice, {
    device: ({ friendlyName }) => friendlyName === deviceFriendlyName,
    service: ({ serviceType }) => serviceType === upnpService,
  });

  const { host, port, hostname } = new URL(location);

  const socket = new net.Socket();
  const controller = control({
    host,
    write: (cmd) => socket.write(cmd),
  });

  socket.connect(Number(port), hostname, () => {
    controller("GetWirelessProfile")
      .then(() => console.log("commanded"))
      .catch((err) => console.error("failed to command", err));
  });

  socket.on("data", (message) => {
    console.log(message.toString());
  });
}

// https://192.168.4.55/settings/index.html

void main({ deviceFriendlyName: "Family Room" });
