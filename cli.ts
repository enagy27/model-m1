#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";

import packageJson from "./package.json" with { type: "json" };

const { name, description, version } = packageJson;

import * as commands from "./commands/index.js";

async function main(args: string[]): Promise<void> {
  const program = new Command()
    .name(name)
    .description(description)
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
