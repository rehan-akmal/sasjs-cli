import chalk from "chalk";

export async function printHelpText() {
  console.log(`
    ${chalk.yellow.bold("Welcome to the Command Line Interface for SASjs!")}

    ${chalk.cyan("Here are commands currently available:")}
    * ${chalk.greenBright(
      "create <foldername>"
    )} - creates the folder structure specified in config.json, inside the provided parent folder
         e.g. sasjs create my-sas-project
    * ${chalk.greenBright("help")} - displays this help text
    * ${chalk.greenBright(
      "build"
    )} - builds the services specified in the ${chalk.cyanBright(
    "buildFolders"
  )} section of the config`);
}
