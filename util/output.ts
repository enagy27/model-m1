import chalk from "chalk";

import type { LogLevel } from "./options.js";

export type IOutput = {
  debug(this: void, info: string): void;
  error(this: void, err: string): void;
  log(this: void, info: string): void;
  table(this: void, data: Record<string, number | string>[]): void;
};

const noop = () => {};

type OutputArgs = {
  logLevel: LogLevel;
};

export function getOutput({ logLevel }: OutputArgs): IOutput {
  return {
    debug:
      logLevel === "debug" ? (info) => console.debug(chalk.cyan(info)) : noop,
    error: (err) => console.error(chalk.red(err)),
    log: (info) => console.log(info),
    table: (data) => console.table(data),
  };
}
