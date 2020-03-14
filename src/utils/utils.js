import shelljs from "shelljs";
import chalk from "chalk";
import path from "path";
import { fileExists } from "./file-utils";

async function inExistingProject(folderPath) {
  const packageJsonExists = await fileExists(
    path.join(process.cwd(), folderPath, "package.json")
  );
  return packageJsonExists;
}

export async function setupNpmProject(folderPath) {
  return new Promise(async (resolve, _) => {
    const isExistingProject = await inExistingProject(folderPath);
    if (!isExistingProject) {
      console.log(
        chalk.greenBright(
          "Initialising NPM project in",
          chalk.cyanBright(folderPath)
        )
      );
      shelljs.exec(`cd ${folderPath} && npm init --yes`, {
        silent: true
      });
    } else {
      console.log(chalk.greenBright("Existing NPM project detected.\n"));
    }
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

export function removeComments(text) {
  const lines = text.split("\n").map(l => l.trim());
  const linesWithoutComment = [];
  let inCommentBlock = false;
  lines.forEach(line => {
    if (line.includes("/*") && line.includes("*/")) {
      linesWithoutComment.push(line);
    } else {
      if (line.startsWith("/*") && !line.endsWith("*/")) {
        inCommentBlock = true;
      }
      if (!inCommentBlock) {
        linesWithoutComment.push(line);
      }
      if (line.endsWith("*/") && !line.includes("/*") && inCommentBlock) {
        inCommentBlock = false;
      }
    }
  });
  return linesWithoutComment.filter(l => !!l.trim()).join("\n");
}
