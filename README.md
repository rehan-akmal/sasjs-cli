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
  1. `sasjs create folderName` - which creates a new folder with the name specified.
  2. `sasjs create` - which creates the files and folder in the current working directory. If this directory is an existing NPM project with a `package.json` file, this command adds `macrocore` to the list of dependencies in that file. Else, it will initialise a new NPM project and then install `macrocore`.
- `build`: loads dependencies and builds services for SAS.
- `help`: displays help text.
- `version`: displays the currently installed version of SASjs CLI.
