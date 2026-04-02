import chalk from "chalk";
import { Option } from "commander";
import { entries, fromEntries } from "./object";

export type IOutput = {
  log(this: void, info: string): void;
  table(this: void, data: Record<string, string | number>[]): void;
  debug(this: void, info: string): void;
  error(this: void, err: string): void;
};

export const logLevels = ["info", "debug"] as const;
export type LogLevel = (typeof logLevels)[number];

export const logLevelOption = new Option(
  "--logLevel <LEVEL>",
  "Verbosity of logging",
)
  .choices(logLevels)
  .default("info");

const noop = () => {};

type OutputArgs = {
  logLevel: LogLevel;
};

export function getOutput({ logLevel }: OutputArgs): IOutput {
  return {
    log: (info) => console.log(info),
    table: (data) => console.table(data),
    debug: logLevel === "debug" ? (info) => console.debug(chalk.cyan(info)) : noop,
    error: (err) => console.error(chalk.red(err)),
  };
}
