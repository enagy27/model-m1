#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";

import * as commands from "./commands";

async function main(args: string[]): Promise<void> {
  const program = new Command()
    .name("marantz-model-m1-remote")
    .description("Remote control for the Marantz Model M1")
    .version("0.1.0");

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
