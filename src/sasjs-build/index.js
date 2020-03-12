import find from "find";
import path from "path";
import chalk from "chalk";
import {
  readFile,
  getSubFoldersInFolder,
  getFilesInFolder,
  createFile,
  createFolder,
  deleteFolder,
  copy
} from "../utils/file-utils";
import { asyncForEach, removeComments } from "../utils/utils";
import { getSourcePaths, getConfiguration } from "../utils/config-utils";

const buildDestinationFolder = path.join(process.cwd(), "sasbuild");

export async function build() {
  await copyFilesToBuildFolder();
  const buildFolders = await getBuildFolders(
    path.join(process.cwd(), "sas", "config.json")
  );
  await asyncForEach(buildFolders, async buildFolder => {
    const folderPath = path.join(buildDestinationFolder, buildFolder);
    const subFolders = await getSubFoldersInFolder(folderPath);
    const filesNamesInPath = await getFilesInFolder(folderPath);
    await asyncForEach(filesNamesInPath, async fileName => {
      const filePath = path.join(folderPath, fileName);
      const dependencies = await loadDependencies(filePath);
      await createFile(filePath, dependencies);
    });
    await asyncForEach(subFolders, async subFolder => {
      const fileNames = await getFilesInFolder(
        path.join(folderPath, subFolder)
      );
      await asyncForEach(fileNames, async fileName => {
        const filePath = path.join(folderPath, subFolder, fileName);
        const dependencies = await loadDependencies(filePath);
        await createFile(filePath, dependencies);
      });
    });
  });
  await createFinalSasFile();
}

async function createFinalSasFile() {
  console.log(
    chalk.greenBright(
      `Creating final ${chalk.cyanBright("deploywebservices.sas")} file`
    )
  );
  let finalSasFileContent = "";
  const finalFilePath = path.join(
    buildDestinationFolder,
    "deploywebservices.sas"
  );
  const buildConfig = await getBuildConfig();
  finalSasFileContent += `\n${buildConfig}`;
  const folderContent = await getFolderContent();
  finalSasFileContent += `\n${folderContent}`;
  finalSasFileContent = removeComments(finalSasFileContent);
  await createFile(finalFilePath, finalSasFileContent);
}

async function getBuildConfig() {
  const buildConfig = await readFile(
    path.join(process.cwd(), "sas", "build", "buildinit.sas")
  );
  const dependencyFilePaths = await getDependencyPaths(buildConfig);
  const dependenciesContent = await getDependencies(dependencyFilePaths);
  return `${dependenciesContent}\n${buildConfig}`;
}

async function getFolderContent() {
  const buildSubFolders = await getSubFoldersInFolder(buildDestinationFolder);
  let folderContent = "";
  await asyncForEach(buildSubFolders, async subFolder => {
    const content = await getContentFor(
      path.join(buildDestinationFolder, subFolder),
      subFolder
    );
    folderContent += `\n${content}`;
  });
  return folderContent;
}

async function getContentFor(folderPath, folderName) {
  let content = `\n%let path=${folderName === "services" ? "" : folderName};\n`;
  const files = await getFilesInFolder(folderPath);
  await asyncForEach(files, async file => {
    const fileContent = await readFile(path.join(folderPath, file));
    const transformedContent = getServiceText(file, fileContent);
    content += `\n${transformedContent}\n`;
  });
  const subFolders = await getSubFoldersInFolder(folderPath);
  await asyncForEach(subFolders, async subFolder => {
    content += await getContentFor(path.join(folderPath, subFolder), subFolder);
  });
  return content;
}

function getServiceText(serviceFileName, fileContent) {
  const serviceName = serviceFileName.replace(".sas", "");
  const sourceCodeLines = getLines(removeComments(fileContent));
  let content = ``;
  sourceCodeLines.forEach(line => {
    const escapedLine = line.split("'").join("''");
    if (escapedLine.trim()) {
      content += `\n put '${escapedLine.trim()}';`;
    }
  });
  return `%let service=${serviceName};
filename sasjs temp lrecl=32767;
data _null_;
file sasjs;
${content}\n
run;
%m&type._createwebservice(path=&appLoc/&path, name=&service, code=sasjs ,replace=yes)
`;
}

function getLines(text) {
  let lines = text.split("\n").map(l => l.trim());
  return lines;
}

async function copyFilesToBuildFolder() {
  await recreateBuildFolder();
  console.log(chalk.greenBright("Copying files to build folder..."));
  const buildFolders = await getBuildFolders(
    path.join(process.cwd(), "sas", "config.json")
  );
  await asyncForEach(buildFolders, async buildFolder => {
    const sourcePath = path.join(process.cwd(), "sas", buildFolder);
    const destinationPath = path.join(buildDestinationFolder, buildFolder);
    await copy(sourcePath, destinationPath);
  });
}

async function recreateBuildFolder() {
  console.log(chalk.greenBright("Recreating to build folder..."));
  await deleteFolder(buildDestinationFolder);
  await createFolder(buildDestinationFolder);
}

export async function loadDependencies(filePath) {
  console.log(
    chalk.greenBright("Loading dependencies for", chalk.cyanBright(filePath))
  );
  let fileContent = await readFile(filePath);
  const serviceInit = await getServiceInit();
  const serviceTerm = await getServiceTerm();
  const dependencyFilePaths = await getDependencyPaths(
    `${fileContent}\n${serviceInit}\n${serviceTerm}`
  );

  const dependenciesContent = await getDependencies(dependencyFilePaths);
  fileContent = `* Dependencies start;\n${dependenciesContent}\n* Dependencies end;\n* ServiceInit start;${serviceInit}\n* ServiceInit end;\n* Service start;\n${fileContent}\n* Service end;\n* ServiceTerm start;\n${serviceTerm}\n* ServiceTerm end;`;

  return fileContent;
}

function diff(x, y) {
  return x.filter(a => !y.includes(a));
}

export async function getServiceInit() {
  const serviceInit = await readFile(
    path.join(process.cwd(), "sas", "build", "serviceinit.sas")
  );
  return serviceInit;
}

export async function getServiceTerm() {
  const serviceTerm = await readFile(
    path.join(process.cwd(), "sas", "build", "serviceterm.sas")
  );
  return serviceTerm;
}

async function getDependencies(filePaths) {
  let dependenciesContent = [];
  await asyncForEach(filePaths, async filePath => {
    const depFileContent = await readFile(filePath);
    dependenciesContent.push(depFileContent);
  });

  return dependenciesContent.join("\n");
}

export async function getDependencyPaths(fileContent) {
  const sourcePaths = await getSourcePaths();
  const dependenciesStart = fileContent.split("<h4> Dependencies </h4>");
  if (dependenciesStart.length > 1) {
    let dependencies = dependenciesStart[1]
      .split("**/")[0]
      .split("\n")
      .filter(d => !!d)
      .map(d => d.replace(/\@li/g, "").replace(/ /g, ""))
      .filter(d => d.endsWith(".sas"));
    dependencies = [...new Set(dependencies)];

    const dependencyPaths = [];
    const foundDependencies = [];
    await asyncForEach(sourcePaths, async sourcePath => {
      await asyncForEach(dependencies, async dep => {
        const filePaths = find.fileSync(dep, sourcePath);
        if (filePaths.length) {
          const fileContent = await readFile(filePaths[0]);
          foundDependencies.push(dep);
          dependencyPaths.push(...(await getDependencyPaths(fileContent)));
        }
        dependencyPaths.push(...filePaths);
      });
    });

    const unfoundDependencies = diff(dependencies, foundDependencies);
    if (unfoundDependencies.length) {
      throw new Error(
        `${"Unable to locate dependencies:"} ${chalk.cyanBright(
          unfoundDependencies.join(", ")
        )}`
      );
    }

    return [...new Set(dependencyPaths)];
  } else {
    return [];
  }
}

async function getBuildFolders(pathToFile) {
  const configuration = await getConfiguration(pathToFile);
  return Promise.resolve(configuration.buildFolders);
}
