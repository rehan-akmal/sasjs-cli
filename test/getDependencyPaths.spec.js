import path from "path";
import { readFile } from "../src/utils/file-utils";
import { getDependencyPaths } from "../src/sasjs-build/index";

describe("getDependencyPaths", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  test("it should recursively get all dependency paths", async done => {
    const fileContent = await readFile(path.join(__dirname, "./example.sas"));
    const dependenciesList = [
      "mv_createfolder.sas",
      "mf_abort.sas",
      "mf_getuniquefileref.sas",
      "mf_getuniquelibref.sas",
      "mf_isblank.sas"
    ];
    const dependencyPaths = await getDependencyPaths(fileContent);

    dependencyPaths.forEach(dep => {
      expect(dependenciesList.some(x => dep.includes(x))).toBeTruthy();
    });
    done();
  });
});
