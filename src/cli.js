import {
  createFileStructure,
  buildServices,
  showHelp,
  showVersion,
  buildWebApp
} from "./main";
import chalk from "chalk";

function parseCommand(rawArgs) {
  checkNodeVersion();
  const args = rawArgs.slice(2);
  if (args.length) {
    const name = getUnaliasedCommand(args[0]);
    return { name, parameters: args[1] };
  }
  return null;
}

function getUnaliasedCommand(command) {
  if (
    command === "version" ||
    command === "--version" ||
    command === "-version" ||
    command === "-v" ||
    command === "--v" ||
    command === "v"
  ) {
    return "version";
  }

  if (
    command === "help" ||
    command === "--help" ||
    command === "-help" ||
    command === "-h" ||
    command === "--h" ||
    command === "h"
  ) {
    return "help";
  }

  if (command === "create" || command === "c") {
    return "create";
  }

  if (command === "build" || command === "b") {
    return "build";
  }
  if (command === "web" || command === "w") {
    return "web";
  }

  return commandName;
}

function checkNodeVersion() {
  const nodeVersion = process.versions.node;
  const majorVersion = parseInt(nodeVersion.substr(0, 2));
  if (majorVersion < 12) {
    console.log(
      chalk.redBright(
        "SASjs CLI requires at least NodeJS version 12. Please upgrade NodeJS and try again."
      )
    );
    process.exit(1);
  }
}

export async function cli(args) {
  const command = parseCommand(args);
  if (!command) {
    showInvalidCommandText();
    return;
  }
  switch (command.name) {
    case "create":
      await createFileStructure(command.parameters);
      break;
    case "build":
      await buildServices(command.parameters);
      break;
    case "help":
      await showHelp();
      break;
    case "version":
      await showVersion();
      break;
    case "web":
      await buildWebApp();
      break;
    default:
      showInvalidCommandText();
      break;
  }
}

function showInvalidCommandText() {
  console.log(
    chalk.redBright.bold(
      "Invalid SASjs command! Run `sasjs help` for a full list of available commands."
    )
  );
}
