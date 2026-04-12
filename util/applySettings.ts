import { type ControlClient } from "../util/createControlClient";
import { type ReceiverSettings } from "../util/receiverSettings";
import { getConfigsFromReceiverSettings } from "../util/getConfigsFromReceiverSettings";
import { entries, isEmptyObject } from "../util/object";
import { type IOutput } from "../util/output";
import { type RenderingControlClient } from "../util/createRenderingControlClient";

type ApplySettingsArgs = {
  controlClient: ControlClient;
  renderingControlClient: RenderingControlClient;
  receiverSettings: ReceiverSettings;
  output: IOutput;
};

export async function applySettings({
  controlClient,
  renderingControlClient,
  receiverSettings,
  output,
}: ApplySettingsArgs) {
  const configs = getConfigsFromReceiverSettings(receiverSettings);

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

      case "LEDConfig": {
        await controlClient("SetLEDConfig", {
          LEDConfig: { LEDConfig: config },
        });
        break;
      }

      case "LowLatencyConfig": {
        await controlClient("SetLowLatencyConfig", {
          LowLatencyConfig: config,
        });
        break;
      }

      case "TvConfig": {
        await controlClient("SetTvConfig", {
          TvConfig: config,
        });
        break;
      }

      case "transcode": {
        await controlClient("SetTranscode", {
          transcode: config,
        });
        break;
      }

      case "VolumeLimit": {
        await controlClient("SetVolumeLimit", {
          VolumeLimit: config,
        });
        break;
      }

      case "Balance": {
        await renderingControlClient("X_SetBalance", {
          InstanceID: 0,
          Channel: "Master",
          DesiredBalance: config,
        });
        break;
      }

      case "Bass": {
        await renderingControlClient("X_SetBass", {
          InstanceID: 0,
          Channel: "Master",
          DesiredBass: config,
        });
        break;
      }

      case "Subwoofer": {
        await renderingControlClient("X_SetSubwoofer", {
          InstanceID: 0,
          Channel: "Master",
          DesiredLevel: config,
        });
        break;
      }

      case "Treble": {
        await renderingControlClient("X_SetTreble", {
          InstanceID: 0,
          Channel: "Master",
          DesiredTreble: config,
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
