import { getBuildTargets } from "../utils/config-utils";
import { asyncForEach } from "../utils/utils";
import {
  readFile,
  fileExists,
  createFolder,
  createFile
} from "../utils/file-utils";
import path from "path";
import { parse } from "node-html-parser";
import fetch from "node-fetch";

const buildDestinationFolder = path.join(process.cwd(), "sasbuild");

export async function createWebAppServices() {
  await createBuildDestinationFolder();
  const buildTargets = await getBuildTargets();
  await asyncForEach(buildTargets, async target => {
    const webAppSourcePath = await target.webSourcePath;
    const destinationPath = path.join(
      buildDestinationFolder,
      target.streamWebFolder
    );
    await createTargetDestinationFolder(target.streamWebFolder);

    if (webAppSourcePath) {
      const indexHtml = await readFile(
        path.join(process.cwd(), webAppSourcePath, "index.html")
      ).then(parse);
      let finalIndexHtml = "<!DOCTYPE html>\n<html>\n";

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
      });
    }
  });
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

async function createTargetDestinationFolder(name) {
  const destinationPath = path.join(buildDestinationFolder, name);
  const pathExists = await fileExists(destinationPath);
  if (!pathExists) {
    await createFolder(destinationPath);
  }
}

async function getWebServiceContent(fileName, content) {
  const lines = content.split("\n");
  let serviceContent = `filename ${fileName} temp lrecl=132006;
data _null_;
file sasjs;
`;
  lines.forEach(line => {
    serviceContent += `put '${line}';\n`;
  });

  serviceContent += "\nrun;\n%sasjsout(JS)";
  return serviceContent;
}
