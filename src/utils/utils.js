import shelljs from "shelljs";
import chalk from "chalk";

export function initNpmProject(folderPath) {
  return new Promise((resolve, _) => {
    console.log(
      chalk.greenBright(
        "Initialising NPM project in",
        chalk.cyanBright(folderPath)
      )
    );
    shelljs.exec(`cd ${folderPath} && npm init --yes`, {
      silent: true
    });
    console.log(chalk.greenBright("Installing MacroCore"));
    shelljs.exec(`cd ${folderPath} && npm i macrocore --save`, {
      silent: true
    });
    return resolve();
  });
}

export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
