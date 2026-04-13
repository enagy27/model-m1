#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { name, version } from "./package.json" with { type: "json" };

import * as commands from "./commands";

async function main(args: string[]): Promise<void> {
  const program = new Command()
    .name(name)
    .description("CLI for the Marantz Model M1")
    .version(version);

  for (const command of Object.values(commands)) {
    program.addCommand(command);
  }

  try {
    await program.parseAsync(args);
    process.exit();
  } catch (err: unknown) {
    console.error(chalk.red(err));
    process.exit(1);
  }
}

void main(process.argv);
