import path from "path";

import { initNpmProject, asyncForEach } from "../utils/utils";
import { getConfiguration } from "../utils/config-utils";
import { createFolderStructure, createFolder, copy } from "../utils/file-utils";
import chalk from "chalk";

export async function create(parentFolderName) {
  const pathToConfig = path.join(__dirname, "../config.json");
  const fileStructure = await getFileStructure(pathToConfig);
  console.log(chalk.greenBright("Creating folders and files..."));
  await createFolder(path.join(process.cwd(), parentFolderName));
  await asyncForEach(fileStructure, async (folder, index) => {
    await createFolderStructure(folder, parentFolderName);
    if (index === 0) {
      await copy(
        pathToConfig,
        path.join(
          process.cwd(),
          parentFolderName,
          folder.folderName,
          "config.json"
        )
      );
    }
  });
  await initNpmProject(path.join(process.cwd(), parentFolderName));
}

async function getFileStructure(pathToFile) {
  const configuration = await getConfiguration(pathToFile);
  return Promise.resolve(configuration.folders);
}
