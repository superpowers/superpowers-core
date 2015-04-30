import * as path from "path";
import * as fs from "fs";

import * as yargs from "yargs";

let argv = yargs
  .describe("data-path", "Path to store/read data files from, including config and projects")
  .argv;

// User data folder
export let userData = path.join(__dirname, "..");

if (argv["data-path"] != null) {
  userData = path.resolve(argv["data-path"]);
} else {
  switch (process.platform) {
    case "win32":
      if (process.env.APPDATA != null) userData = path.join(process.env.APPDATA, "Superpowers");
      break;
    case "darwin":
      if (process.env.HOME != null) userData = path.join(process.env.HOME, "Library", "Superpowers");
      break;
    default:
      if (process.env.XDG_DATA_HOME != null) userData = path.join(process.env.XDG_DATA_HOME, "Superpowers");
      else if (process.env.HOME != null) userData = path.join(process.env.HOME, ".local/share", "Superpowers");
  }
}

// Projects folder
export let projects = path.join(__dirname, "../projects");

if (argv["data-path"] != null || ! fs.existsSync(projects)) {
  projects = path.join(userData, "projects");
  try { fs.mkdirSync(userData); } catch(e) {}
  try { fs.mkdirSync(projects); } catch(e) {}
}

// Config file
export let config = path.join(__dirname, "../config.json");

if (argv["data-path"] != null || ! fs.existsSync(config)) {
  config = path.join(userData, "config.json");
}
