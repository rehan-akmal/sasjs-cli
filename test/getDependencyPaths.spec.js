import path from "path";
import { readFile } from "../src/utils/file-utils";
import {
  getDependencyPaths,
  prioritiseDependencyOverrides
} from "../src/sasjs-build/index";

describe("getDependencyPaths", () => {
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

  test("it should get third level dependencies", async done => {
    const fileContent = await readFile(
      path.join(__dirname, "./nested-deps.sas")
    );
    const dependenciesList = [
      "mm_createwebservice.sas",
      "mm_createstp.sas",
      "mm_getwebappsrvprops.sas",
      "mf_getuser.sas",
      "mm_createfolder.sas",
      "mm_deletestp.sas",
      "mf_nobs.sas",
      "mf_getattrn.sas",
      "mf_abort.sas",
      "mf_verifymacvars.sas",
      "mm_getdirectories.sas",
      "mm_updatestpsourcecode.sas",
      "mp_dropmembers.sas",
      "mm_getservercontexts.sas",
      "mm_getrepos.sas"
    ];
    const dependencyPaths = await getDependencyPaths(fileContent);
    dependencyPaths.forEach(dep => {
      console.log(
        dep,
        dependenciesList.some(x => dep.includes(x))
      );
      expect(dependenciesList.some(x => dep.includes(x))).toBeTruthy();
    });
    done();
  });

  test("it should throw an error when a dependency is not found", async done => {
    const fileContent = await readFile(
      path.join(__dirname, "./missing-dependency.sas")
    );
    await expect(getDependencyPaths(fileContent)).rejects.toThrow();
    done();
  });

  test("it should ignore non-sas dependencies", async done => {
    const fileContent = await readFile(
      path.join(__dirname, "./non-sas-dependency.sas")
    );
    const dependenciesList = [
      "mv_createfolder.sas",
      "mf_abort.sas",
      "mf_getuniquefileref.sas",
      "mf_getuniquelibref.sas",
      "mf_isblank.sas"
    ];

    await expect(getDependencyPaths(fileContent)).resolves.not.toThrow();
    const dependencyPaths = await getDependencyPaths(fileContent);
    dependencyPaths.forEach(dep => {
      expect(dependenciesList.some(x => dep.includes(x))).toBeTruthy();
    });
    done();
  });

  test("it should prioritise overridden dependencies", () => {
    const dependencyNames = ["mf_abort.sas"];
    const dependencyPaths = [
      "node_modules/macrocore/core/mf_abort.sas",
      "sas/macros/mf_abort.sas"
    ];

    const result = prioritiseDependencyOverrides(
      dependencyNames,
      dependencyPaths
    );
    expect(result).toEqual(["sas/macros/mf_abort.sas"]);
  });
});
