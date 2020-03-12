import { readFile } from "./file-utils";
import path from "path";

export async function getConfiguration(pathToFile) {
  const config = await readFile(pathToFile);
  if (config) {
    const configJson = JSON.parse(config);
    return Promise.resolve(configJson.config ? configJson.config : configJson);
  }
  return Promise.reject();
}

export async function getFolders() {
  const config = await readFile(path.join(__dirname, "../config.json"));
  if (config) {
    const configJson = JSON.parse(config);
    return Promise.resolve(configJson.folders);
  }
  return Promise.reject();
}

export async function getSourcePaths() {
  const configuration = await getConfiguration(
    path.join(process.cwd(), "sas", "config.json")
  ).catch(() => ({ macroLocations: [], useMacroCore: true }));
  const sourcePaths = configuration.macroLocations.map(l =>
    path.join(process.cwd(), l)
  );
  if (configuration.useMacroCore) {
    const macroCorePath = path.join(process.cwd(), "node_modules", "macrocore");
    sourcePaths.push(macroCorePath);
  }

  return sourcePaths;
}

export async function getBuildTargets() {
  const configuration = await getConfiguration(
    path.join(process.cwd(), "sas", "config.json")
  );
  return configuration.targets;
}

export function getMacroCorePath() {
  return path.join(process.cwd(), "node_modules", "macrocore");
}
