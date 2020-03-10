import { removeComments } from "../src/utils/utils";
import { sampleSasProgram } from "./sample-sas";

describe("removeComments", () => {
  test("should remove block comment", () => {
    const text = `/* test\n123\n456\n789 */`;
    expect(removeComments(text)).toEqual("");
  });

  test("should remove single line block comment", () => {
    const text = `/* test */`;
    expect(removeComments(text)).toEqual("");
  });

  test("should remove all comments from the provided SAS file", () => {
    const expected = `%macro mv_createfolder(path=
,access_token_var=ACCESS_TOKEN
,grant_type=authorization_code
);`;
    expect(removeComments(sampleSasProgram)).toEqual(expected);
  });

  test("should not remove code from a line that has an inline comment and code", () => {
    const text = "/* Some Comment */ CODE HERE;";
    const expected = " CODE HERE;";
    expect(removeComments(text)).toEqual(expected);
  });

  test("should not remove code from a line that has code followed by an inline comment", () => {
    const text = "CODE HERE /* Some Comment  */";
    const expected = "CODE HERE ";
    console.log(removeComments(text));
    expect(removeComments(text)).toEqual(expected);
  });
});
