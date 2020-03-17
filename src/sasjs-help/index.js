import chalk from "chalk";

export async function printHelpText() {
  console.log(`
    ${chalk.yellow.bold("Welcome to the Command Line Interface for SASjs!")}

    ${chalk.cyan("Here are commands currently available:")}
    * ${chalk.greenBright(
      "create <foldername>"
    )} - creates the folder structure specified in config.json, inside the provided parent folder
         e.g. sasjs create my-sas-project
       - if no foldername is specified, it creates the folder structure in the current working directory.
       - If this is an existing NPM project, it will update package.json with the macrocore dependency.
    * ${chalk.greenBright("help")} - displays this help text
    * ${chalk.greenBright(
      "build <buildTargetName>"
    )} - builds the services specified in the ${chalk.cyanBright(
    "buildFolders"
  )} section of the config for the specified build target. If none is specified, it will build the first target present in config.json.`);
}
