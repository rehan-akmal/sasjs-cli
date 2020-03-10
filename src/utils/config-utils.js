import { readFile } from "./file-utils";
import path from "path";

export async function getConfiguration(pathToFile) {
  const config = await readFile(pathToFile);
  if (config) {
    const configJson = JSON.parse(config);
    return Promise.resolve(configJson);
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

export function getMacroCorePath() {
  return path.join(process.cwd(), "node_modules", "macrocore");
}
