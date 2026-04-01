import chalk from "chalk";
import { Option } from "commander";

export type IOutput = {
  log(this: void, info: string): void;
  debug(this: void, info: string): void;
  error(this: void, err: string): void;
};

export const logLevels = ["debug", "info"] as const;
export type LogLevel = (typeof logLevels)[number];

export const logLevelOption = new Option(
  "--logLevel <LEVEL>",
  "Verbosity of logging",
)
  .choices(logLevels)
  .default("info");

const noop = () => {};

export function getOutput(logLevel: LogLevel): IOutput {
  const debugFn = (info: string) => console.debug(chalk.cyan(info));

  return {
    log: (info) => console.log(info),
    debug: logLevel === "debug" ? debugFn : noop,
    error: (err) => console.error(chalk.red(err)),
  };
}
