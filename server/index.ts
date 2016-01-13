/// <reference path="index.d.ts" />

import * as dummy_https from "https";
import * as fs from "fs";
import * as mkdirp from "mkdirp";

/* tslint:disable */
let https: typeof dummy_https = require("follow-redirects").https;
let unzip = require("unzip");
/* tslint:enable */

let systemIdRegex = /^[a-z0-9_-]+$/;

let systemFolderNamesById: { [id: string]: string } = {};
let systemsPath = `${__dirname}/../systems`;
try { fs.mkdirSync(systemsPath); } catch (err) { /* Ignore */ }

for (let entry of fs.readdirSync(systemsPath)) {
  if (!systemIdRegex.test(entry)) continue;
  if (!fs.statSync(`${systemsPath}/${entry}`).isDirectory) continue;

  let systemId: string;
  try {
    let packageData = fs.readFileSync(`${systemsPath}/${entry}/package.json`, { encoding: "utf8" });
    systemId = JSON.parse(packageData).superpowers.systemId;
  } catch (err) {
    console.error(`Could not load system id from systems/${entry}/package.json:`);
    console.error(err.stack);
    process.exit(1);
  }
  systemFolderNamesById[systemId] = entry;
}

let command = process.argv[2];

switch (command) {
  case "start":
    /* tslint:disable */
    require("./start").default();
    /* tslint:enable */
    break;
  case "install": install(); break;
  case "init": init(); break;
  default:
    if (command != null) console.error(`Unknown command: ${command}`);
    console.log("Available commands: start, install, init");
    process.exit(1);
    break;
}

type Registry = { [sytemId: string]: { repository: string; plugins: { [name: string]: string } } };
function getRegistry(callback: (err: Error, registry: Registry) => any) {
  let registryUrl = "https://raw.githubusercontent.com/superpowers/superpowers/master/registry.json";
  let request = https.get(registryUrl, (res) => {
    if (res.statusCode !== 200) {
      callback(new Error(`Unexpected status code: ${res.statusCode}`), null);
      return;
    }

    let content = "";
    res.on("data", (chunk: string) => { content += chunk; });
    res.on("end", () => {
      let registry: Registry;
      try { registry = JSON.parse(content); }
      catch (err) {
        callback(new Error(`Could not parse registry as JSON`), null);
        return;
      }

      callback(null, registry);
    });
  });

  request.on("error", (err: Error) => {
    callback(err, null);
  });
}

function install() {
  getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    let installPattern = process.argv[3];
    if (installPattern == null) {
      console.log(`Available systems: ${Object.keys(registry).join(", ")}.`);
      process.exit(0);
    }

    let systemId: string;
    let pluginName: string;

    if (installPattern.indexOf(":") === -1) {
      systemId = installPattern;
    } else {
      [ systemId, pluginName ] = installPattern.split(":");
    }

    if (registry[systemId] == null) {
      console.error(`System ${systemId} doesn't exist.`);
      console.error(`Available systems: ${Object.keys(registry).join(", ")}.`);
      process.exit(1);
    }

    if (systemFolderNamesById[systemId] != null) {
      if (pluginName == null) {
        console.error(`System ${systemId} is already installed.`);
        console.error(`Available systems: ${Object.keys(registry).join(", ")}.`);
        process.exit(1);
      }

      installPlugin(systemId, pluginName, registry[systemId].plugins[pluginName]);
    } else {
      if (pluginName != null) {
        console.error(`System ${systemId} is not installed.`);
        process.exit(1);
      }

      console.log(`Installing system ${systemId}...`);
      installSystem(registry[systemId].repository);
    }
  });
}

function installSystem(repositoryURL: string) {
  let repositoryPath = `${repositoryURL.replace("https://github.com", "/repos")}/releases/latest`;
  let request = https.get({
    hostname: "api.github.com",
    path: repositoryPath,
    headers: { "user-agent": "Superpowers" }
  }, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Couldn't get latest release from repository at ${repositoryURL}:`);
      let err = new Error(`Unexpected status code: ${res.statusCode}`);
      console.error(err.stack);
      process.exit(1);
    }

    let content = "";
    res.on("data", (chunk: string) => { content += chunk; });
    res.on("end", () => {
      let repositoryInfo = JSON.parse(content);
      let downloadUrl = repositoryInfo.assets[0].browser_download_url;

      https.get({
        hostname: "github.com",
        path: downloadUrl,
        headers: { "user-agent": "Superpowers" }
      }, (res) => {
        if (res.statusCode !== 200) {
          console.error("Couldn't download the system:");
          let err = new Error(`Unexpected status code: ${res.statusCode}`);
          console.error(err.stack);
          process.exit(1);
        }
        res.pipe(unzip.Extract({ path: systemsPath }));
        res.on("end", () => { console.log("System successfully installed."); });
      });
    });
  });

  request.on("error", (err: Error) => {
    console.error("Couldn't download the system");
    console.error(err.stack);
    process.exit(1);
  });
}

function installPlugin(systemId: string, pluginName: string, repositoryURL: string) {
  console.error("Plugin installation isn't supported yet.");
  process.exit(1);
}

function init() {
  let systemId = process.argv[3];
  if (!systemIdRegex.test(systemId)) {
    console.error("Invalid system ID: only lowercase letters, numbers and dashes are allowed.");
    process.exit(1);
  }

  if (systemFolderNamesById[systemId] != null) {
    console.error(`You already have a system with the ID ${systemId} installed as systems/${systemFolderNamesById[systemId]}.`);
    process.exit(1);
  }

  let stats: fs.Stats;
  try { stats = fs.lstatSync(`${systemsPath}/${systemId}`); } catch (err) { /* Ignore */ }
  if (stats != null) {
    console.error(`systems/${systemId} already exists.`);
    process.exit(1);
  }

  getRegistry((err, registry) => {
    if (registry[systemId] != null) {
      console.error(`System ${systemId} already exists.`);
      process.exit(1);
    }

    initSystem(systemId);
  });
}

function initSystem(systemId: string) {
  let packageJSON = JSON.stringify({
    name: `superpowers-${systemId}`,
    description: "A system for Superpowers, the HTML5 app for real-time collaborative projects",
    superpowers: {
      systemId: systemId,
      publishedPluginBundles: []
    }
  }, null, 2) + "\n";

  let systemPath = `${systemsPath}/${systemId}`;
  fs.mkdirSync(systemPath);

  fs.writeFileSync(`${systemPath}/package.json`, packageJSON);

  let localeJSON = JSON.stringify({
    title: `${systemId}`,
    description: `(Edit systems/${systemId}/public/locales/en/system.json to change the title and description)`
  }, null, 2) + "\n";

  mkdirp.sync(`${systemPath}/public/locales/en`);
  fs.writeFileSync(`${systemPath}/public/locales/en/system.json`, localeJSON);

  console.log(`A system named ${systemId} has been initialized.`);
}
