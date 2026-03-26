#!/usr/bin/env node

import net from "net";
import fs from "fs/promises";
import pathUtils from "path";
import * as v from "valibot";
import dgram from "dgram";

import { awaitAtMost, sleep } from "./util/async";
import { getServiceDeviceDescriptorUrl } from "./util/getServiceDeviceDescriptorUrl";
import { AiosDevice, getAiosDevice } from "./util/getAiosDevice";
import { findService } from "./util/findService";
import { control, ControlInstance } from "./util/control";
import { upnp } from "./util/upnp";
import { upnpService, upnpAddress, upnpPort } from "./env";
import {
  ReceiverSettings,
  receiverSettingsSchema,
} from "./util/receiverSettings";
import { getConfigsFromReceiverSettings } from "./util/getConfigsFromReceiverSettings";
import { entries } from "./util/object";

type IOutput = {
  log(info: string): void;
  error(err: string): void;
};

type DiscoverArgs = {
  friendlyName: string;
  output: IOutput;
};

async function discover({ friendlyName, output }: DiscoverArgs) {
  let deviceDescriptorUrl: string | undefined;
  try {
    const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const client = upnp({
      host: `${upnpAddress}:${upnpPort}`,
      send: (message) => socket.send(message, upnpPort, upnpAddress),
    });

    output.log(`Searching for device descriptor URL`);
    deviceDescriptorUrl = await getServiceDeviceDescriptorUrl({
      socket,
      client,
      service: upnpService,
    });
    output.log(
      `Successfully retrieved device descriptor URL "${deviceDescriptorUrl}"`,
    );
  } catch (error) {
    output.error(`Failed to discover plug-n-play device: ${upnpService}`);
    throw error;
  }

  let aiosDevice: AiosDevice | undefined;
  try {
    output.log(`Getting AIOS device at "${deviceDescriptorUrl}"`);
    aiosDevice = await getAiosDevice(deviceDescriptorUrl);
    output.log(`Successfully got AIOS device at "${deviceDescriptorUrl}"`);
  } catch (error) {
    output.error(
      `Failed to retrieve device descriptor at ${deviceDescriptorUrl}`,
    );
    throw error;
  }

  const deviceControlService = findService(aiosDevice, {
    device: (device) => device.friendlyName === friendlyName,
    service: (service) => service.serviceType === upnpService,
  });

  const { hostname, port } = new URL(deviceDescriptorUrl);

  output.log(
    `Identified device control service "${hostname}:${port}${deviceControlService.controlURL}"`,
  );

  return {
    port: Number(port),
    hostname,
    pathname: deviceControlService.controlURL,
  };
}

type ReadSettingsFileArgs = {
  path: string;
  output: IOutput;
};

async function readSettingsFile({
  path,
  output,
}: ReadSettingsFileArgs): Promise<ReceiverSettings> {
  try {
    const resolvedPath = pathUtils.resolve(path);
    output.log(`Settings file path resolved to: "${resolvedPath}"`);

    const receiverSettingsTextData = await fs.readFile(resolvedPath, "utf-8");
    output.log(`Successfully read settings file`);

    return v.parse(
      receiverSettingsSchema,
      JSON.parse(receiverSettingsTextData),
    );
  } catch (error) {
    output.error(`Failed to read settings file: "${path}"`);
    throw error;
  }
}

type ApplySettingsArgs = {
  controller: ControlInstance;
  receiverSettings: ReceiverSettings;
};

async function applySettings({
  controller,
  receiverSettings,
}: ApplySettingsArgs) {
  const configs = getConfigsFromReceiverSettings(receiverSettings);

  for (const [command, config] of entries(configs)) {
    if (!config) {
      continue;
    }

    switch (command) {
      case "AudioConfig": {
        await controller("SetAudioConfig", {
          AudioConfig: { AudioConfig: config },
        });

        continue;
      }

      case "LEDConfig": {
        await controller("SetLEDConfig", {
          LEDConfig: config,
        });

        continue;
      }

      case "TVConfig": {
        await controller("SetTvConfig", {
          TvConfig: config,
        });

        continue;
      }

      case "VolumeLimit": {
        await controller("SetVolumeLimit", {
          VolumeLimit: config,
        });

        continue;
      }
    }
  }

  // wait for the socket to finish up
  await sleep(100);

  await controller("GetVolumeLimit");

  await sleep(1000);
}

type MainArgs = {
  friendlyName: string;
  settingsFile: string;
  discoverTimeout: number;
  output: {
    log(info: string): void;
    error(err: string): void;
  };
};

async function main({
  friendlyName,
  settingsFile,
  output,
  discoverTimeout,
}: MainArgs) {
  output.log(`Reading settingsFile="${settingsFile}"`);
  const receiverSettingsPromise = readSettingsFile({
    path: settingsFile,
    output,
  });

  output.log(`Discovering device friendlyName="${friendlyName}"`);
  const discoverPromise = awaitAtMost(
    discover({ friendlyName, output }),
    discoverTimeout,
  );

  const receiverSettings = await receiverSettingsPromise;
  output.log(`Successfully parsed settings file`);

  const { port, hostname, pathname } = await discoverPromise;
  output.log(`Successfully discovered device at ${hostname}:${port}`);

  const controlSocket = new net.Socket();

  controlSocket.on("data", (message) => {
    output.log(`data received: ${message.toString()}`);
  });

  controlSocket.connect(port, hostname, () => {
    const controller = control({
      host: `${hostname}:${port}`,
      pathname,
      write: (cmd) => controlSocket.write(cmd),
    });

    void applySettings({ controller, receiverSettings })
      .catch((err) => {
        output.error(`Failed to apply settings: ${err}`);
        controlSocket.destroy();
        process.exit(1);
      })
      .finally(() => {
        controlSocket.destroy();
        process.exit(0);
      });
  });
}

// https://192.168.4.55/settings/index.html

void main({
  friendlyName: "Family Room",
  settingsFile: "./preset.json",
  output: console,
  discoverTimeout: 5_000,
});
