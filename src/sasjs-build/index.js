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
import {
  getSourcePaths,
  getConfiguration,
  getBuildTargets,
  getMacroCorePath
} from "../utils/config-utils";

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
  await createFinalSasFiles();
}

async function createFinalSasFiles() {
  const buildTargets = await getBuildTargets();
  asyncForEach(buildTargets, async target => {
    const { deployScript, appLoc, serverType } = target;
    createFinalSasFile(deployScript, appLoc, serverType);
  });
}

async function createFinalSasFile(fileName, appLoc, serverType) {
  console.log(
    chalk.greenBright(`Creating final ${chalk.cyanBright(fileName)} file`)
  );
  let finalSasFileContent = "";
  const finalFilePath = path.join(buildDestinationFolder, fileName);
  const buildConfig = await getBuildConfig(appLoc, serverType);
  finalSasFileContent += `\n${buildConfig}`;
  const folderContent = await getFolderContent(serverType);
  finalSasFileContent += `\n${folderContent}`;
  finalSasFileContent = removeComments(finalSasFileContent);
  await createFile(finalFilePath, finalSasFileContent);
}

async function getBuildConfig(appLoc, serverType) {
  let buildConfig = "";
  const createWebServiceScript = await getCreateWebServiceScript(serverType);
  buildConfig += `${createWebServiceScript}\n`;
  const dependencyFilePaths = await getDependencyPaths(buildConfig);
  const dependenciesContent = await getDependencies(dependencyFilePaths);
  return `%let appLoc=${appLoc}; /* metadata or files service location of your app */\n${dependenciesContent}\n${buildConfig}\n`;
}

async function getCreateWebServiceScript(serverType) {
  switch (serverType.toUpperCase()) {
    case "SASVIYA":
      return await readFile(
        `${getMacroCorePath()}/viya/mv_createwebservice.sas`
      );

    case "SAS9":
      return await readFile(
        `${getMacroCorePath()}/meta/mm_createwebservice.sas`
      );

    default:
      throw new Error(
        `Invalid server type: valid options are ${chalk.cyanBright(
          "SASVIYA"
        )} and ${chalk.cyanBright("SAS9")}`
      );
  }
}

function getWebServiceScriptInvocation(serverType) {
  switch (serverType.toUpperCase()) {
    case "SASVIYA":
      return "%mv_createwebservice(path=&appLoc/&path, name=&service, code=sascode ,replace=yes)";
    case "SAS9":
      return "%mm_createwebservice(path=&appLoc/&path, name=&service, code=sascode ,replace=yes)";
    default:
      throw new Error(
        `Invalid server type: valid options are ${chalk.cyanBright(
          "SASVIYA"
        )} and ${chalk.cyanBright("SAS9")}`
      );
  }
}

async function getFolderContent(serverType) {
  const buildSubFolders = await getSubFoldersInFolder(buildDestinationFolder);
  let folderContent = "";
  await asyncForEach(buildSubFolders, async subFolder => {
    const content = await getContentFor(
      path.join(buildDestinationFolder, subFolder),
      subFolder,
      serverType
    );
    folderContent += `\n${content}`;
  });
  return folderContent;
}

async function getContentFor(folderPath, folderName, serverType) {
  let content = `\n%let path=${folderName === "services" ? "" : folderName};\n`;
  const files = await getFilesInFolder(folderPath);
  await asyncForEach(files, async file => {
    const fileContent = await readFile(path.join(folderPath, file));
    const transformedContent = getServiceText(file, fileContent, serverType);
    content += `\n${transformedContent}\n`;
  });
  const subFolders = await getSubFoldersInFolder(folderPath);
  await asyncForEach(subFolders, async subFolder => {
    content += await getContentFor(
      path.join(folderPath, subFolder),
      subFolder,
      serverType
    );
  });
  return content;
}

function getServiceText(serviceFileName, fileContent, serverType) {
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
filename sascode temp lrecl=32767;
data _null_;
file sascode;
${content}\n
run;
${getWebServiceScriptInvocation(serverType)}
filename sascode clear;
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

    let dependencyPaths = [];
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

    dependencyPaths = prioritiseDependencyOverrides(
      dependencies,
      dependencyPaths
    );

    return [...new Set(dependencyPaths)];
  } else {
    return [];
  }
}

export function prioritiseDependencyOverrides(
  dependencyNames,
  dependencyPaths
) {
  dependencyNames.forEach(depFileName => {
    const paths = dependencyPaths.filter(p => p.includes(depFileName));
    const overriddenDependencyPath = paths.find(
      p => !p.includes("node_modules")
    );
    if (overriddenDependencyPath) {
      const pathToRemove = paths.find(p => p !== overriddenDependencyPath);
      const index = dependencyPaths.indexOf(pathToRemove);
      if (index > -1) {
        dependencyPaths.splice(index, 1);
      }
    }
  });

  return dependencyPaths;
}

async function getBuildFolders(pathToFile) {
  const configuration = await getConfiguration(pathToFile);
  return Promise.resolve(configuration.buildFolders);
}
