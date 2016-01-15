/// <reference path="index.d.ts" />

import * as dummy_https from "https";
import * as fs from "fs";
import * as mkdirp from "mkdirp";

/* tslint:disable */
let https: typeof dummy_https = require("follow-redirects").https;
let unzip = require("unzip");
/* tslint:enable */

let folderNameRegex = /^[a-z0-9_-]+$/;
let pluginNameRegex = /^[A-Za-z0-9]+\/[A-Za-z0-9]+$/;

let systemsById: { [id: string]: { folderName: string; plugins: { [author: string]: string[] } } } = {};
let systemsPath = `${__dirname}/../systems`;
try { fs.mkdirSync(systemsPath); } catch (err) { /* Ignore */ }

for (let entry of fs.readdirSync(systemsPath)) {
  if (!folderNameRegex.test(entry)) continue;
  if (!fs.statSync(`${systemsPath}/${entry}`).isDirectory) continue;

  let systemId: string;
  let systemPath = `${systemsPath}/${entry}`;
  try {
    let packageData = fs.readFileSync(`${systemPath}/package.json`, { encoding: "utf8" });
    systemId = JSON.parse(packageData).superpowers.systemId;
  } catch (err) {
    console.error(`Could not load system id from systems/${entry}/package.json:`);
    console.error(err.stack);
    process.exit(1);
  }
  systemsById[systemId] = { folderName: entry, plugins: {} };
  let pluginAuthors: string[];
  try { pluginAuthors = fs.readdirSync(`${systemPath}/plugins`); } catch (err) { /* Ignore */ }
  if (pluginAuthors == null) continue;

  for (let pluginAuthor of pluginAuthors) {
    if (pluginAuthor === "default" || pluginAuthor === "common") continue;
    if (!folderNameRegex.test(pluginAuthor)) continue;

    let pluginNames: string[] = [];
    for (let pluginName of fs.readdirSync(`${systemPath}/plugins/${pluginAuthor}`)) {
      if (!folderNameRegex.test(pluginName)) continue;
      if (!fs.statSync(`${systemPath}/plugins/${pluginAuthor}/${pluginName}`).isDirectory) continue;
      pluginNames.push(pluginName);
    }
    if (pluginNames.length > 0) {
      systemsById[systemId].plugins[pluginAuthor] = pluginNames;
    }
  }
}

let command = process.argv[2];

switch (command) {
  case "start":
    /* tslint:disable */
    require("./start").default();
    /* tslint:enable */
    break;
  case "list": list(); break;
  case "install": install(); break;
  case "init": init(); break;
  default:
    if (command != null) console.error(`Unknown command: ${command}`);
    console.log("Available commands: start, install, init");
    process.exit(1);
    break;
}

function list() {
  for (let systemId in systemsById) {
    let system = systemsById[systemId];
    console.log(`System ${systemId} installed in folder ${system.folderName}.`);

    let pluginAuthors = Object.keys(system.plugins);
    if (pluginAuthors.length === 0) {
      console.log("No external plugin installed.");
    } else {
      for (let pluginAuthor of pluginAuthors) {
        console.log(`|- ${pluginAuthor}`);
        for (let pluginName of system.plugins[pluginAuthor]) console.log(`   |- ${pluginName}`);
      }
    }
    console.log("\n");
  }
}

const currentRegistryVersion = 1;
type Registry = { version: number; systems: { [sytemId: string]: { repository: string; plugins: { [author: string]: { [name: string]: string } } } } };
function getRegistry(callback: (err: Error, registry: Registry) => any) {
  // FIXME: Use registry.json instead once the next release is out
  let registryUrl = "https://raw.githubusercontent.com/superpowers/superpowers/master/registryNext.json";
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

      if (registry.version !== currentRegistryVersion) callback(new Error("The registry format has changed. Please update Superpowers."), null);
      else callback(null, registry);
    });
  });

  request.on("error", (err: Error) => {
    callback(err, null);
  });
}

function listAvailableSystems(registry: Registry) { console.log(`Available systems: ${Object.keys(registry.systems).join(", ")}.`); }
function listAvailablePlugins(registry: Registry, systemId: string) {
  let pluginAuthors = Object.keys(registry.systems[systemId].plugins);
  if (pluginAuthors.length === 0) {
    console.log(`No available plugins in system ${systemId}.`);
  } else {
    console.log(`Available plugins in system ${systemId}.`);
    for (let pluginAuthor of pluginAuthors) {
      console.log(`|- ${pluginAuthor}`);
      for (let pluginName of Object.keys(registry.systems[systemId].plugins[pluginAuthor])) console.log(`   |- ${pluginName}`);
    }
  }
}

function getLatestRelease(repositoryURL: string, callback: (downloadURL: string) => void) {
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
      let downloadURL: string;
      if (repositoryInfo.assets.length > 0) downloadURL = repositoryInfo.assets[0].browser_download_url;
      else downloadURL = repositoryInfo.zipball_url;
      callback(downloadURL);
    });
  });

  request.on("error", (err: Error) => {
    console.error(`Couldn't get latest release from repository at ${repositoryURL}:`);
    console.error(err.stack);
    process.exit(1);
  });
}

function install() {
  getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    let pattern = process.argv[3];
    if (pattern == null) {
      listAvailableSystems(registry);
      process.exit(0);
    }

    let systemId: string;
    let pluginPath: string;

    if (pattern.indexOf(":") === -1) {
      systemId = pattern;
    } else {
      [ systemId, pluginPath ] = pattern.split(":");
    }

    if (registry.systems[systemId] == null) {
      console.error(`System ${systemId} doesn't exist.`);
      listAvailableSystems(registry);
      process.exit(1);
    }

    let systemFolderName = systemsById[systemId].folderName;
    if (systemFolderName != null) {
      if (pluginPath == null) {
        console.error(`System ${systemId} is already installed.`);
        listAvailableSystems(registry);
        process.exit(1);
      } else if (pluginPath === "") {
        listAvailablePlugins(registry, systemId);
        process.exit(0);
      }

      let [ pluginAuthor, pluginName ] = pluginPath.split("/");
      if (registry.systems[systemId].plugins[pluginAuthor] == null || registry.systems[systemId].plugins[pluginAuthor][pluginName] == null) {
        console.error(`Plugin ${pluginPath} doesn't exist.`);
        listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      if (systemsById[systemId].plugins[pluginAuthor] != null && systemsById[systemId].plugins[pluginAuthor].indexOf(pluginName) !== -1) {
        console.error(`Plugin ${pluginPath} is already installed.`);
        listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      // console.log(`Installing plugin ${pluginPath} on system ${systemId}...`);
      // installPlugin(systemId, pluginAuthor, registry.systems[systemId].plugins[pluginAuthor][pluginName]);
      console.log(`Plugin installation isn't supported yet`);
    } else {
      if (pluginPath != null) {
        console.error(`System ${systemId} is not installed.`);
        process.exit(1);
      }

      console.log(`Installing system ${systemId}...`);
      installSystem(registry.systems[systemId].repository);
    }
  });
}

function installSystem(repositoryURL: string) {
  getLatestRelease(repositoryURL, (downloadURL) => {
    https.get({
      hostname: "github.com",
      path: downloadURL,
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
}

function installPlugin(systemId: string, pluginAuthor: string, repositoryURL: string) {
  getLatestRelease(repositoryURL, (downloadURL) => {
    let pluginPath = `${systemsPath}/${systemsById[systemId].folderName}/plugins/${pluginAuthor}`;
    mkdirp.sync(pluginPath);
    console.log(downloadURL);

    https.get({
      hostname: "github.com",
      path: downloadURL,
      headers: { "user-agent": "Superpowers" }
    }, (res) => {
      if (res.statusCode !== 200) {
        console.error("Couldn't download the plugin:");
        let err = new Error(`Unexpected status code: ${res.statusCode}`);
        console.error(err.stack);
        process.exit(1);
      }
      res.pipe(unzip.Extract({ path: pluginPath }));
      res.on("end", () => { console.log("Plugin successfully installed."); });
    });
  });
}

function init() {
  let pattern = process.argv[3];
  let systemId: string;
  let pluginPath: string;

  if (pattern.indexOf(":") === -1) {
    systemId = pattern;
  } else {
    [ systemId, pluginPath ] = pattern.split(":");
  }

  if (!folderNameRegex.test(systemId)) {
    console.error("Invalid system ID: only lowercase letters, numbers and dashes are allowed.");
    process.exit(1);
  }

  if (pluginPath != null && !pluginNameRegex.test(pluginPath)) {
    console.error("Invalid plugin name: only two sets of letters and numbers separated by a slash are allowed.");
    process.exit(1);
  }

  let systemFolderName = systemsById[systemId].folderName;

  if (pluginPath == null && systemFolderName != null) {
    console.error(`You already have a system with the ID ${systemId} installed as systems/${systemFolderName}.`);
    process.exit(1);
  } else if (pluginPath != null && systemFolderName == null) {
    console.error(`You don't have a system with the ID ${systemId} installed.`);
    process.exit(1);
  }

  if (systemFolderName == null) systemFolderName = systemId;

  let systemStats: fs.Stats;
  try { systemStats = fs.lstatSync(`${systemsPath}/${systemFolderName}`); } catch (err) { /* Ignore */ }

  if (pluginPath == null) {
    if (systemStats != null) {
      console.error(`systems/${systemFolderName} already exists.`);
      process.exit(1);
    }
  } else {
    if (systemStats == null) {
      console.error(`systems/${systemFolderName} doesn't exist.`);
      process.exit(1);
    }

    let pluginStats: fs.Stats;
    try { pluginStats = fs.lstatSync(`${systemsPath}/${systemFolderName}/plugins/${pluginPath}`); } catch (err) { /* Ignore */ }
    if (pluginStats != null) {
      console.error(`systems/${systemFolderName}/plugins/${pluginPath} already exists.`);
      process.exit(1);
    }
  }

  getRegistry((err, registry) => {
    let registrySystemEntry = registry.systems[systemId];
    if (pluginPath == null && registrySystemEntry != null) {
      console.error(`System ${systemId} already exists.`);
      process.exit(1);
    } else if (pluginPath != null && registrySystemEntry != null) {
      let [ pluginAuthor, pluginName ] = pluginPath.split("/");
      if (registrySystemEntry.plugins[pluginAuthor][pluginName] != null) {
        console.error(`Plugin ${pluginPath} on system ${systemId} already exists.`);
        process.exit(1);
      }
    }

    if (pluginPath == null) initSystem(systemId);
    else initPlugin(systemFolderName, systemId, pluginPath);
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

function initPlugin(systemFolderName: string, systemId: string, pluginName: string) {
  let pluginSlug = pluginName.replace(/\//g, "-").replace(/[A-Z]/g, (x) => `-${x.toLowerCase()}`);
  let packageJSON = JSON.stringify({
    name: `superpowers-${systemId}-${pluginSlug}-plugin`,
    description: `Plugin for Superpowers ${systemId}`,
    scripts: {
      "build": "gulp --gulpfile=../../../../../scripts/pluginGulpfile.js --cwd=."
    }
  }, null, 2) + "\n";

  let pluginPath = `${systemsPath}/${systemFolderName}/plugins/${pluginName}`;
  mkdirp.sync(pluginPath);
  fs.writeFileSync(`${pluginPath}/package.json`, packageJSON);

  let tsconfigJSON = JSON.stringify({
    "compilerOptions": {
      "module": "commonjs",
      "target": "es5",
      "noImplicitAny": true
    }
  }, null, 2) + "\n";
  fs.writeFileSync(`${pluginPath}/tsconfig.json`, tsconfigJSON);

  let indexDTS = `/// <reference path="../../../../../SupClient/SupClient.d.ts" />
/// <reference path="../../../../../SupCore/SupCore.d.ts" />
`;
  fs.writeFileSync(`${pluginPath}/index.d.ts`, indexDTS);

  console.log(`A plugin named ${pluginName} has been initialized in systems/${systemFolderName}.`);
}
