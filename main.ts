#!/usr/bin/env node

import net from "net";
import fs from "fs/promises";
import path from "path";
import * as v from "valibot";

import { awaitAtMost, sleep } from "./util/async";
import { getServiceDeviceDescriptorUrl } from "./util/getServiceDeviceDescriptorUrl";
import { getAiosDevice } from "./util/getAiosDevice";
import { findService } from "./util/findService";
import { control } from "./util/control";
import { upnpService } from "./env";
import { receiverSettingsSchema } from "./util/receiverSettings";
import { getConfigsFromReceiverSettings } from "./util/getConfigsFromReceiverSettings";
import { entries } from "./util/object";

type MainArgs = {
  deviceFriendlyName: string;
  settingsFile: string;
};

async function getControlArgs({
  deviceFriendlyName,
}: Pick<MainArgs, "deviceFriendlyName">) {
  let deviceDescriptorUrl: string | undefined;
  try {
    deviceDescriptorUrl = await getServiceDeviceDescriptorUrl(upnpService);
  } catch (error) {
    console.error(
      `Failed to locate receiver as plug-n-play device: ${upnpService}`,
    );
    throw error;
  }

  let aiosDevice;
  try {
    aiosDevice = await getAiosDevice(deviceDescriptorUrl);
  } catch (error) {
    console.error(
      `Failed to retrieve device descriptor at ${deviceDescriptorUrl}`,
    );
    throw error;
  }

  const deviceControlService = findService(aiosDevice, {
    device: ({ friendlyName }) => friendlyName === deviceFriendlyName,
    service: ({ serviceType }) => serviceType === upnpService,
  });

  const { hostname, port } = new URL(deviceDescriptorUrl);

  return {
    port: Number(port),
    hostname,
    pathname: deviceControlService.controlURL,
  };
}

async function main({ deviceFriendlyName, settingsFile }: MainArgs) {
  const socket = new net.Socket();
  const timeout = 5_000 as const;

  const receiverSettings = v.parse(
    receiverSettingsSchema,
    (await import(settingsFile)).default,
  );

  const { hostname, port, pathname } = await awaitAtMost(
    getControlArgs({ deviceFriendlyName }),
    timeout,
  );

  const run = async () => {
    const receiverSettingsTextData = await fs.readFile(
      path.resolve(settingsFile),
      "utf-8",
    );
    const receiverSettingsParsed = v.safeParse(
      receiverSettingsSchema,
      JSON.parse(receiverSettingsTextData),
    );
    if (!receiverSettingsParsed.success) {
      console.error(
        `Failed to read settings file: "${settingsFile}". Issues:`,
        receiverSettingsParsed.issues,
      );
    }

    const configs = getConfigsFromReceiverSettings(receiverSettings);

    const controller = control({
      host: `${hostname}:${port}`,
      pathname,
      write: (cmd) => socket.write(cmd),
    });

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
    socket.destroy();
  };

  socket.connect(port, hostname, () => {
    void run()
      .then(() => {
        console.log("ran!");
        process.exit(0);
      })
      .catch((err) => {
        console.error("failed to run", err);
        process.exit(1);
      });
  });
}

// https://192.168.4.55/settings/index.html

void main({ deviceFriendlyName: "Family Room", settingsFile: "./preset.json" });
