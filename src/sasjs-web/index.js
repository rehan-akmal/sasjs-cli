import { getBuildTargets } from "../utils/config-utils";
import { asyncForEach } from "../utils/utils";
import {
  readFile,
  fileExists,
  createFolder,
  createFile,
  deleteFolder
} from "../utils/file-utils";
import path from "path";
import chalk from "chalk";
import { parse } from "node-html-parser";
import fetch from "node-fetch";
import { sasjsout } from "./sasjsout";

const buildDestinationFolder = path.join(process.cwd(), "sasbuild");

export async function createWebAppServices(targets = []) {
  console.log(chalk.greenBright("Building web app services..."));
  await createBuildDestinationFolder();
  let buildTargets = [];
  if (!targets.length) {
    buildTargets = await getBuildTargets();
  } else {
    buildTargets = [...targets];
  }

  await asyncForEach(buildTargets, async target => {
    console.log(
      chalk.greenBright(`Building for target ${chalk.cyanBright(target.name)}`)
    );
    const webAppSourcePath = target.webSourcePath;
    const destinationPath = path.join(
      buildDestinationFolder,
      "services",
      target.streamWebFolder
    );
    await createTargetDestinationFolder(destinationPath);

    if (webAppSourcePath) {
      const indexHtml = await readFile(
        path.join(process.cwd(), webAppSourcePath, "index.html")
      ).then(parse);
      let finalIndexHtml = "<!DOCTYPE html>\n<html>\n<head>";

      const scriptPaths = getScriptPaths(indexHtml);
      await asyncForEach(scriptPaths, async scriptPath => {
        const isUrl = scriptPath.startsWith("http");
        const fileName = `${path.basename(scriptPath).replace(/\./g, "")}`;
        let content = "";

        if (isUrl) {
          content = await fetch(scriptPath).then(r => r.text());
        } else {
          content = await readFile(
            path.join(process.cwd(), webAppSourcePath, scriptPath)
          );
        }

        const serviceContent = await getWebServiceContent(fileName, content);

        await createFile(
          path.join(destinationPath, `${fileName}.sas`),
          serviceContent
        );
        const scriptTag = getScriptTag(
          target.appLoc,
          target.serverType,
          fileName
        );
        finalIndexHtml += `\n${scriptTag}`;
      });
      finalIndexHtml += "</head>";
      finalIndexHtml += `<body>${
        indexHtml.querySelector("body").innerHTML
      }</body></html>`;
      await createClickMeService(finalIndexHtml, target.name);
    } else {
      throw new Error(
        "webSourcePath has not been specified. Please check your config and try again."
      );
    }
  });
}

function getScriptTag(appLoc, serverType, fileName) {
  const permittedServerTypes = ["SAS9", "SASVIYA"];
  if (!permittedServerTypes.includes(serverType.toUpperCase())) {
    throw new Error(
      "Unsupported server type. Supported types are SAS9 and SASVIYA"
    );
  }
  const storedProcessPath =
    serverType === "SASVIYA"
      ? `/SASJobExecution?_PROGRAM=${appLoc}/web`
      : `/SASStoredProcess?_PROGRAM=${appLoc}/web`;
  return `<script src="${storedProcessPath}/${fileName}"></script>`;
}

function getScriptPaths(parsedHtml) {
  const scriptSources = parsedHtml
    .querySelectorAll("script")
    .map(s => s.getAttribute("src"));

  return scriptSources;
}

async function createBuildDestinationFolder() {
  const pathExists = await fileExists(buildDestinationFolder);
  if (!pathExists) {
    await createFolder(buildDestinationFolder);
  }
}

async function createTargetDestinationFolder(destinationPath) {
  const pathExists = await fileExists(destinationPath);
  if (pathExists) {
    await deleteFolder(destinationPath);
  }
  await createFolder(destinationPath);
}

async function getWebServiceContent(fileName, content) {
  const lines = content.split("\n");
  let serviceContent = `${sasjsout}\nfilename ${fileName} temp lrecl=132006;
data _null_;
file sasjs;
`;
  lines.forEach(line => {
    const chunkedLines = chunk(line);
    if (chunkedLines.length === 1) {
      serviceContent += `put '${chunkedLines[0].split("'").join("''")}';\n`;
    } else {
      let combinedLines = "";
      chunkedLines.forEach((chunkedLine, index) => {
        let text = `put '${chunkedLine.split("'").join("''")}'`;
        if (index !== chunkedLines.length - 1) {
          text += "@;\n";
        } else {
          text += ";\n";
        }
        combinedLines += text;
      });
      serviceContent += combinedLines;
    }
  });

  serviceContent += "\nrun;\n%sasjsout(JS)";
  return serviceContent;
}

function chunk(text, maxLength = 120) {
  if (text.length <= maxLength) {
    return [text];
  }
  return text.match(new RegExp(".{1," + maxLength + "}", "g"));
}

async function createClickMeService(indexHtmlContent, buildTargetName) {
  const lines = indexHtmlContent.split("\n");
  let clickMeServiceContent = `${sasjsout}\nfilename sasjs temp lrecl=132006;\ndata _null_;\nfile sasjs;\n`;

  lines.forEach(line => {
    clickMeServiceContent += `put '${line}';\n`;
  });
  clickMeServiceContent += "run;\n%sasjsout(HTML)";
  await createFile(
    path.join(buildDestinationFolder, "services", "clickme.sas"),
    clickMeServiceContent
  );
}
