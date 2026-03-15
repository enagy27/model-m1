#!/usr/bin/env node

import net from "net";
import { HeosInstance } from "./util/heos";
import { awaitAtMost } from "./util/async";
import { getDeviceLocation } from "./util/getDeviceLocation";
import { getAiosDevice } from "./util/getAiosDevice";
import { ensureArray } from "./util/array";
import { findService } from "./util/findService";
import { control } from "./util/control";

function heosListener(socket: net.Socket, client: HeosInstance) {
  socket.on("data", (buffer) => {
    const data = buffer.toString();

    try {
      const response = client.response(data);
      console.log("response:", response);

      switch (response.heos.command) {
        case "player/get_players": {
          const [{ pid }] = response.payload;
          client.command("player/volume_down", { pid });
          //   client.command("player/volume_up", { pid });
        }
      }
    } catch (e) {
      console.error("Unable to parse", data);
    }
  });

  socket.on("error", (err) => {
    console.error("Error:", err.message);
  });

  socket.on("close", () => {
    console.log("Connection closed");
  });

  // socket.connect(heosPort, host, () => {
  //   console.log("Connection opened");
  //   client.command("player/get_players");
  // });
}

type MainArgs = {
  deviceFriendlyName: string;
};

async function main({ deviceFriendlyName }: MainArgs) {
  const timeout = 5_000;
  const upnpService = "urn:schemas-denon-com:service:ACT:1";

  const location = await awaitAtMost(getDeviceLocation(upnpService), timeout);
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
    controller()
      .then(() => console.log("commanded"))
      .catch(() => console.error("failed to command"));
  });
}

// https://192.168.4.55/settings/index.html

void main({ deviceFriendlyName: "Family Room" });
