import path from "path";

import { setupNpmProject, asyncForEach } from "../utils/utils";
import { getFolders, getConfiguration } from "../utils/config-utils";
import {
  createFolderStructure,
  createFolder,
  createFile,
  fileExists
} from "../utils/file-utils";
import chalk from "chalk";

export async function create(parentFolderName = ".") {
  const config = await getConfiguration(path.join(__dirname, "../config.json"));
  const fileStructure = await getFileStructure();
  console.log(chalk.greenBright("Creating folders and files..."));
  if (parentFolderName !== ".") {
    await createFolder(path.join(process.cwd(), parentFolderName));
  }
  await asyncForEach(fileStructure, async (folder, index) => {
    const pathExists = await fileExists(
      path.join(process.cwd(), parentFolderName, folder.folderName)
    );
    if (pathExists) {
      throw new Error(
        `${chalk.redBright(
          `The folder ${chalk.cyanBright(
            folder.folderName
          )} already exists! Please remove any unnecessary files and try again.`
        )}`
      );
    }
    await createFolderStructure(folder, parentFolderName);
    if (index === 0) {
      const configDestinationPath = path.join(
        process.cwd(),
        parentFolderName,
        folder.folderName,
        "config.json"
      );
      await createFile(configDestinationPath, JSON.stringify(config, null, 1));
    }
  });
  await setupNpmProject(parentFolderName);
}

async function getFileStructure() {
  return await getFolders();
}
