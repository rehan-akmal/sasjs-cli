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
import jsdom from "jsdom";
import base64img from "base64-img";
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
      ).then(content => new jsdom.JSDOM(content));

      const scriptTags = getScriptTags(indexHtml);
      await asyncForEach(scriptTags, async tag => {
        await updateTagSource(tag, webAppSourcePath, destinationPath, target);
      });
      const linkTags = getLinkTags(indexHtml);
      await asyncForEach(linkTags, async linkTag => {
        await updateLinkHref(
          linkTag,
          webAppSourcePath,
          destinationPath,
          target
        );
      });

      const faviconTags = getFaviconTags(indexHtml);

      await asyncForEach(faviconTags, async faviconTag => {
        await updateFaviconHref(
          faviconTag,
          webAppSourcePath,
          destinationPath,
          target
        );
      });

      await createClickMeService(indexHtml.serialize());
    } else {
      throw new Error(
        "webSourcePath has not been specified. Please check your config and try again."
      );
    }
  });
}

async function updateTagSource(tag, webAppSourcePath, destinationPath, target) {
  const scriptPath = tag.getAttribute("src");
  const isUrl = scriptPath && scriptPath.startsWith("http");

  if (scriptPath) {
    const fileName = `${path.basename(scriptPath).replace(/\./g, "")}`;
    if (!isUrl) {
      const content = await readFile(
        path.join(process.cwd(), webAppSourcePath, scriptPath)
      );
      const serviceContent = await getWebServiceContent(content);

      await createFile(
        path.join(destinationPath, `${fileName}.sas`),
        serviceContent
      );

      tag.setAttribute(
        "src",
        getScriptPath(
          target.appLoc,
          target.serverType,
          target.streamWebFolder,
          fileName
        )
      );
    }
  }
}

async function updateLinkHref(
  linkTag,
  webAppSourcePath,
  destinationPath,
  target
) {
  const linkSourcePath = linkTag.getAttribute("href");
  const isUrl = linkSourcePath.startsWith("http");
  const fileName = `${path.basename(linkSourcePath).replace(/\./g, "")}`;
  if (!isUrl) {
    const content = await readFile(
      path.join(process.cwd(), webAppSourcePath, linkSourcePath)
    );
    const serviceContent = await getWebServiceContent(content, "CSS");

    await createFile(
      path.join(destinationPath, `${fileName}.sas`),
      serviceContent
    );
    const linkHref = getLinkHref(
      target.appLoc,
      target.serverType,
      target.streamWebFolder,
      fileName
    );
    linkTag.setAttribute("href", linkHref);
  }
}

async function updateFaviconHref(linkTag, webAppSourcePath) {
  const linkSourcePath = linkTag.getAttribute("href");
  const isUrl = linkSourcePath.startsWith("http");
  if (!isUrl) {
    const base64string = base64img.base64Sync(
      path.join(process.cwd(), webAppSourcePath, linkSourcePath)
    );
    linkTag.setAttribute("href", base64string);
  }
}

function getScriptPath(appLoc, serverType, streamWebFolder, fileName) {
  const permittedServerTypes = ["SAS9", "SASVIYA"];
  if (!permittedServerTypes.includes(serverType.toUpperCase())) {
    throw new Error(
      "Unsupported server type. Supported types are SAS9 and SASVIYA"
    );
  }
  const storedProcessPath =
    serverType === "SASVIYA"
      ? `/SASJobExecution?_PROGRAM=${appLoc}/${streamWebFolder}`
      : `/SASStoredProcess/?_PROGRAM=${appLoc}/${streamWebFolder}`;
  return `${storedProcessPath}/${fileName}`;
}

function getLinkHref(appLoc, serverType, streamWebFolder, fileName) {
  const permittedServerTypes = ["SAS9", "SASVIYA"];
  if (!permittedServerTypes.includes(serverType.toUpperCase())) {
    throw new Error(
      "Unsupported server type. Supported types are SAS9 and SASVIYA"
    );
  }
  const storedProcessPath =
    serverType === "SASVIYA"
      ? `/SASJobExecution?_PROGRAM=${appLoc}/${streamWebFolder}`
      : `/SASStoredProcess/?_PROGRAM=${appLoc}/${streamWebFolder}`;
  return `${storedProcessPath}/${fileName}`;
}

function getScriptTags(parsedHtml) {
  return parsedHtml.window.document.querySelectorAll("script");
}

function getLinkTags(parsedHtml) {
  const linkTags = Array.from(
    parsedHtml.window.document.querySelectorAll("link")
  ).filter(s => s.getAttribute("rel") === "stylesheet");

  return linkTags;
}

function getFaviconTags(parsedHtml) {
  const linkTags = Array.from(
    parsedHtml.window.document.querySelectorAll("link")
  ).filter(s => s.getAttribute("rel").includes("icon"));

  return linkTags;
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

async function getWebServiceContent(content, type = "JS") {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter(l => !!l);
  let serviceContent = `${sasjsout}\nfilename sasjs temp lrecl=99999999;
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

  serviceContent += `\nrun;\n%sasjsout(${type})`;
  return serviceContent;
}

function chunk(text, maxLength = 120) {
  if (text.length <= maxLength) {
    return [text];
  }
  return text.match(new RegExp(".{1," + maxLength + "}", "g")).filter(m => !!m);
}

async function createClickMeService(indexHtmlContent) {
  const lines = indexHtmlContent.replace(/\r\n/g, "\n").split("\n");
  let clickMeServiceContent = `${sasjsout}\nfilename sasjs temp lrecl=99999999;\ndata _null_;\nfile sasjs;\n`;

  lines.forEach(line => {
    const chunkedLines = chunk(line);
    if (chunkedLines.length === 1) {
      clickMeServiceContent += `put '${chunkedLines[0]
        .split("'")
        .join("''")}';\n`;
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
      clickMeServiceContent += combinedLines;
    }
  });
  clickMeServiceContent += "run;\n%sasjsout(HTML)";
  await createFile(
    path.join(buildDestinationFolder, "services", "clickme.sas"),
    clickMeServiceContent
  );
}
