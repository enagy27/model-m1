import { type ControlClient } from "#util/createControlClient.js";
import { type RenderingControlClient } from "#util/createRenderingControlClient.js";
import { type ConfigsFromReceiverSettings } from "#util/getConfigsFromReceiverSettings.js";
import { entries, isEmptyObject } from "#util/object.js";
import { type IOutput } from "#util/output.js";

export type ApplyConfigsArgs = {
  configs: ConfigsFromReceiverSettings;
  controlClient: ControlClient;
  output: IOutput;
  renderingControlClient: RenderingControlClient;
};

export async function applyConfigs({
  configs,
  controlClient,
  output,
  renderingControlClient,
}: ApplyConfigsArgs) {
  for await (const [command, config] of entries(configs)) {
    if (config == null) {
      output.debug(`skipping "${command}"`);
      continue;
    }

    if (typeof config === "object" && isEmptyObject(config)) {
      output.debug(`skipping "${command}"`);
      continue;
    }

    output.debug(
      `command="${command}" with config: ${JSON.stringify(config, null, 2)}`,
    );

    switch (command) {
      case "AudioConfig": {
        await controlClient("SetAudioConfig", {
          AudioConfig: { AudioConfig: config },
        });
        break;
      }

      case "Balance": {
        await renderingControlClient("X_SetBalance", {
          Channel: "Master",
          DesiredBalance: config,
          InstanceID: 0,
        });
        break;
      }

      case "Bass": {
        await renderingControlClient("X_SetBass", {
          Channel: "Master",
          DesiredBass: config,
          InstanceID: 0,
        });
        break;
      }

      case "LEDConfig": {
        await controlClient("SetLEDConfig", {
          LEDConfig: { LEDConfig: config },
        });
        break;
      }

      case "LowLatencyConfig": {
        await controlClient("SetLowLatencyConfig", {
          LowLatencyConfig: { LowLatencyConfig: config },
        });
        break;
      }

      case "Subwoofer": {
        await renderingControlClient("X_SetSubwoofer", {
          Channel: "Master",
          DesiredLevel: config,
          InstanceID: 0,
        });
        break;
      }

      case "transcode": {
        await controlClient("SetTranscode", {
          transcode: config,
        });
        break;
      }

      case "Treble": {
        await renderingControlClient("X_SetTreble", {
          Channel: "Master",
          DesiredTreble: config,
          InstanceID: 0,
        });
        break;
      }

      case "TvConfig": {
        await controlClient("SetTvConfig", {
          TvConfig: { TvConfig: config },
        });
        break;
      }

      case "VolumeLimit": {
        await controlClient("SetVolumeLimit", {
          VolumeLimit: config,
        });
        break;
      }

      default: {
        output.debug(`No applySettings handler for ${command}`);
        break;
      }
    }
  }
}
