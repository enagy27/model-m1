import { Option } from "commander";

export function hostname() {
  return new Option(
    "--hostname <IP_ADDRESS>",
    "Host used for connecting to the device for control purposes",
  );
}

export function port() {
  return new Option(
    "--port <PORT>",
    "Port used for connecting to the device for control purposes",
  ).argParser(Number);
}

export function actControlUrl() {
  return new Option("--actControlUrl <URL>", "act control endpoint");
}

export function renderingControlUrl() {
  return new Option(
    "--renderingControlUrl <URL>",
    "rendering control endpoint",
  );
}

export const logLevels = ["info", "debug"] as const;
export type LogLevel = (typeof logLevels)[number];

export function logLevel() {
  return new Option("--logLevel <LEVEL>", "Verbosity of logging")
    .choices(logLevels)
    .default("info");
}
