import { Option } from "commander";

export const hostname = new Option(
  "--hostname <IP_ADDRESS>",
  "Host used for connecting to the device for control purposes",
);

export const port = new Option(
  "--port <PORT>",
  "Port used for connecting to the device for control purposes",
).argParser(Number);

export const actControlUrl = new Option(
  "--actControlUrl <URL>",
  "act control endpoint",
);

export const renderingControlUrl = new Option(
  "--renderingControlUrl <URL>",
  "rendering control endpoint",
);

export const logLevels = ["info", "debug"] as const;
export type LogLevel = (typeof logLevels)[number];

export const logLevel = new Option("--logLevel <LEVEL>", "Verbosity of logging")
  .choices(logLevels)
  .default("info");
