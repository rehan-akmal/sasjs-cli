import { createFileStructure, buildServices, showHelp } from "./main";
import chalk from "chalk";

function parseCommand(rawArgs) {
  checkNodeVersion();
  const args = rawArgs.slice(2);
  if (args.length) {
    return { name: args[0], parameters: args[1] };
  }
  return null;
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
  switch (command.name) {
    case "create":
      await createFileStructure(command.parameters);
      break;
    case "build":
      await buildServices();
      break;
    case "help":
      await showHelp();
      break;
    default:
      console.log(
        chalk.redBright.bold(
          "Invalid SASjs command! Run `sasjs help` for a full list of available commands."
        )
      );
      break;
  }
}