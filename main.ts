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
import { upnpService, upnpAddress, upnpPort } from "./env";
import * as sockets from "./util/sockets";
import {
  ReceiverSettings,
  receiverSettingsSchema,
} from "./util/receiverSettings";
import { getConfigsFromReceiverSettings } from "./util/getConfigsFromReceiverSettings";
import { entries, isEmptyObject } from "./util/object";

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
    const socket = dgram.createSocket({
      type: "udp4",
      reuseAddr: true,
    });

    output.log(
      `discover: Searching for device descriptor URL for service "${upnpService}"`,
    );
    deviceDescriptorUrl = await getServiceDeviceDescriptorUrl({
      host: `${upnpAddress}:${upnpPort}`,
      service: upnpService,
      output,
      socket: {
        bind: () => socket.bind(),
        on: (eventName, listener) => socket.on(eventName, listener),
        off: (eventName, listener) => socket.on(eventName, listener),
        send: (message) => socket.send(message, upnpPort, upnpAddress),
      },
    });
    output.log(
      `discover: Successfully retrieved device descriptor URL "${deviceDescriptorUrl}" for service "${upnpService}"`,
    );
  } catch (error) {
    output.error(
      `discover: Failed to discover plug-n-play device: "${upnpService}"`,
    );
    throw error;
  }

  let aiosDevice: AiosDevice | undefined;
  try {
    output.log(`discover: Getting AIOS device at "${deviceDescriptorUrl}"`);
    aiosDevice = await getAiosDevice(deviceDescriptorUrl);
    output.log(
      `discover: Successfully got AIOS device at "${deviceDescriptorUrl}"`,
    );
  } catch (error) {
    output.error(
      `discover: Failed to retrieve device descriptor at ${deviceDescriptorUrl}`,
    );
    throw error;
  }

  const deviceControlService = findService(aiosDevice, {
    device: (device) => device.friendlyName === friendlyName,
    service: (service) => service.serviceType === upnpService,
  });

  const { hostname, port } = new URL(deviceDescriptorUrl);

  output.log(
    `discover: Identified device control service "${hostname}:${port}${deviceControlService.controlURL}"`,
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
    output.log(
      `readSettingsFile: Settings file path resolved to: "${resolvedPath}"`,
    );

    const receiverSettingsTextData = await fs.readFile(resolvedPath, "utf-8");
    output.log(`readSettingsFile: Successfully read settings file`);

    return v.parse(
      receiverSettingsSchema,
      JSON.parse(receiverSettingsTextData),
    );
  } catch (error) {
    output.error(`readSettingsFile: Failed to read settings file: "${path}"`);
    throw error;
  }
}

type ApplySettingsArgs = {
  controller: ControlInstance;
  receiverSettings: ReceiverSettings;
  output: IOutput;
};

async function applySettings({
  controller,
  receiverSettings,
  output,
}: ApplySettingsArgs) {
  const configs = getConfigsFromReceiverSettings(receiverSettings);

  for (const [command, config] of entries(configs)) {
    if (config == null) {
      output.log(`applySettings: skipping "${command}"`);
      continue;
    }

    if (typeof config === "object" && isEmptyObject(config)) {
      output.log(`applySettings: skipping "${command}"`);
      return;
    }

    output.log(
      `applySettings: command="${command}" with config: ${JSON.stringify(config, null, 2)}`,
    );

    switch (command) {
      case "AudioConfig": {
        await controller("SetAudioConfig", {
          AudioConfig: { AudioConfig: config },
        });

        continue;
      }

      case "LEDConfig": {
        await controller("SetLEDConfig", {
          LEDConfig: { LEDConfig: config },
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

  await controller("GetLEDConfig");

  // Wait for the response
  await sleep(1_000);
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
  output.log(`main: Reading settingsFile="${settingsFile}"`);
  const receiverSettingsPromise = readSettingsFile({
    path: settingsFile,
    output,
  });

  output.log(`main: Discovering device friendlyName="${friendlyName}"`);
  const discoverPromise = awaitAtMost(
    discover({ friendlyName, output }),
    discoverTimeout,
  );

  const receiverSettings = await receiverSettingsPromise;
  output.log(`main: Successfully parsed settings file`);

  const { port, hostname, pathname } = await discoverPromise;
  output.log(`main: Successfully discovered device at "${hostname}:${port}"`);

  const controlSocket = new net.Socket();

  controlSocket.on("data", (buffer) => {
    const message = buffer.toString();

    try {
      const response = sockets.response(message);

      output.log(`main: ${response.statusCode} response received: ${message}`);
    } catch (error) {
      output.log(`main: data received: ${message}`);
    }
  });

  controlSocket.connect(port, hostname, () => {
    const controller = control({
      host: `${hostname}:${port}`,
      pathname,
      write: (cmd) => controlSocket.write(cmd),
      output,
    });

    void applySettings({ controller, receiverSettings, output })
      .catch((err) => {
        output.error(`main: Failed to apply settings: ${err}`);
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
