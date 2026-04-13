import chalk from "chalk";
import type { LogLevel } from "./options.js";

export type IOutput = {
  log(this: void, info: string): void;
  table(this: void, data: Record<string, string | number>[]): void;
  debug(this: void, info: string): void;
  error(this: void, err: string): void;
};

const noop = () => {};

type OutputArgs = {
  logLevel: LogLevel;
};

export function getOutput({ logLevel }: OutputArgs): IOutput {
  return {
    log: (info) => console.log(info),
    table: (data) => console.table(data),
    debug:
      logLevel === "debug" ? (info) => console.debug(chalk.cyan(info)) : noop,
    error: (err) => console.error(chalk.red(err)),
  };
}
