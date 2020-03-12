import path from "path";

import { initNpmProject, asyncForEach } from "../utils/utils";
import { getFolders, getConfiguration } from "../utils/config-utils";
import {
  createFolderStructure,
  createFolder,
  createFile
} from "../utils/file-utils";
import chalk from "chalk";

export async function create(parentFolderName) {
  const config = await getConfiguration(path.join(__dirname, "../config.json"));
  const fileStructure = await getFileStructure();
  console.log(chalk.greenBright("Creating folders and files..."));
  await createFolder(path.join(process.cwd(), parentFolderName));
  await asyncForEach(fileStructure, async (folder, index) => {
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
  await initNpmProject(path.join(process.cwd(), parentFolderName));
}

async function getFileStructure() {
  return await getFolders();
}
