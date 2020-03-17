# SASjs CLI

Command Line Interface for SASjs.

## Usage

1. Install the CLI via `npm`
   ```
       npm install -g sasjs-cli
   ```
2. You will then be able to run the command `sasjs` from your command line with one of the available options.

```
    sasjs <option>
```

## Available Options

- `create`: creates the folders and files required for SAS development. You can use this command in two ways:
  1. `sasjs create folderName` - which creates a new folder with the name specified. An alias for this command is `sasjs c folderName`.
  2. `sasjs create` - which creates the files and folder in the current working directory. If this directory is an existing NPM project with a `package.json` file, this command adds `macrocore` to the list of dependencies in that file. Else, it will initialise a new NPM project and then install `macrocore`. An alias for this command is `sasjs c`.
- `build targetName`: loads dependencies and builds services for SAS, for the specified build target name. If no target is specified, it builds the first target specified in `config.json`. An alias for this command is `sasjs b folderName`.
- `web`: generates SAS services for streaming your HTML, CSS and JavaScript-based app from a SAS server. This command is automatically run as part of `sasjs build` if `streamWeb` is set to true for a particular build target. An alias for this command is `sasjs w`.
- `help`: displays help text. Aliases for this command are `sasjs h`, `sasjs --help`, `sasjs -help` and `sasjs --h`.
- `version`: displays the currently installed version of SASjs CLI. Aliases for this command are `sasjs v`, `sasjs --version`, `sasjs -version` and `sasjs --v`.
