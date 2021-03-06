import { build } from "./sasjs-build";
import { create } from "./sasjs-create";
import { printHelpText } from "./sasjs-help";
import { printVersion } from "./sasjs-version";
import { createWebAppServices } from "./sasjs-web";
import chalk from "chalk";

export async function createFileStructure(parentFolderName) {
  await create(parentFolderName)
    .then(() =>
      console.log(
        chalk.greenBright.bold.italic(
          `Project ${
            parentFolderName ? `${parentFolderName} created` : `updated`
          } successfully.\nGet ready to Unleash your SAS!`
        )
      )
    )
    .catch(err => {
      console.log(
        chalk.redBright(
          "An error has occurred whilst creating your project.",
          err
        )
      );
    });
}

export async function showHelp() {
  await printHelpText();
}

export async function showVersion() {
  await printVersion();
}

export async function buildServices(targetName) {
  await build(targetName)
    .then(() =>
      console.log(
        chalk.greenBright.bold.italic(
          `Services have been successfully built!\nThe build output is located in the ${chalk.cyanBright(
            "sasbuild"
          )} directory.`
        )
      )
    )
    .catch(err => {
      console.log(
        chalk.redBright("An error has occurred when building services.", err)
      );
    });
}

export async function buildWebApp() {
  await createWebAppServices()
    .then(() =>
      console.log(
        chalk.greenBright.bold.italic(
          `Web app services have been successfully built!\nThe build output is located in the ${chalk.cyanBright(
            "sasbuild"
          )} directory.`
        )
      )
    )
    .catch(err => {
      console.log(
        chalk.redBright(
          "An error has occurred when building web app services.",
          err
        )
      );
    });
}
