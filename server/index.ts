/// <reference path="index.d.ts" />

import * as dummy_https from "https";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as yargs from "yargs";
import * as rimraf from "rimraf";
import * as readline from "readline";

/* tslint:disable */
const https: typeof dummy_https = require("follow-redirects").https;
const unzip = require("unzip");
/* tslint:enable */


// Command line interface
const argv = yargs
  .usage("Usage: $0 <command> [options]")
  .demand(1, "Enter a command")
  .command("start", "Start the server", (yargs) => {
    yargs
      .demand(1, 1, `The "start" command doesn't accept any arguments`)
      .describe("data-path", "Path to store/read data files from, including config and projects")
      .argv;
  })
  .command("list", "List currently installed systems and plugins", (yargs) => {
    yargs.demand(1, 1, `The "list" command doesn't accept any arguments`).argv;
  })
  .command("registry", "List registry content", (yargs) => {
    yargs.demand(1, 1, `The "registry" command doesn't accept any arguments`).argv;
  })
  .command("install", "Install a system or plugin", (yargs) => {
    yargs.demand(2, 2, `The "install" command requires a single argument: "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .command("uninstall", "Uninstall a system or plugin", (yargs) => {
    yargs.demand(2, 2, `The "uninstall" command requires a single argument: "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .command("update", "Update the server, a system or a plugin", (yargs) => {
    yargs.demand(2, 2, `The "update" command requires a single argument: server, "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .command("init", "Generate a skeleton for a new system or plugin", (yargs) => {
    yargs.demand(2, 2, `The "init" command requires a single argument: "systemId" or "systemId:pluginAuthor/pluginName"`).argv;
  })
  .help("h").alias("h", "help")
  .argv;

// Data path
const dataPath = argv["data-path"] != null ? path.resolve(argv["data-path"]) : path.resolve(`${__dirname}/..`);
mkdirp.sync(dataPath);
mkdirp.sync(`${dataPath}/projects`);
mkdirp.sync(`${dataPath}/builds`);
const systemsPath = `${dataPath}/systems`;
mkdirp.sync(systemsPath);

// Systems and plugins
const folderNameRegex = /^[a-z0-9_-]+$/;
const pluginNameRegex = /^[A-Za-z0-9]+\/[A-Za-z0-9]+$/;
const builtInPluginAuthors = [ "default", "common", "extra" ];

const systemsById: { [id: string]: { folderName: string; plugins: { [author: string]: string[] } } } = {};

for (const entry of fs.readdirSync(systemsPath)) {
  if (!folderNameRegex.test(entry)) continue;
  if (!fs.statSync(`${systemsPath}/${entry}`).isDirectory) continue;

  let systemId: string;
  const systemPath = `${systemsPath}/${entry}`;
  try {
    const packageData = fs.readFileSync(`${systemPath}/package.json`, { encoding: "utf8" });
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

  for (const pluginAuthor of pluginAuthors) {
    if (builtInPluginAuthors.indexOf(pluginAuthor) !== -1) continue;
    if (!folderNameRegex.test(pluginAuthor)) continue;

    const pluginNames: string[] = [];
    for (const pluginName of fs.readdirSync(`${systemPath}/plugins/${pluginAuthor}`)) {
      if (!folderNameRegex.test(pluginName)) continue;
      if (!fs.statSync(`${systemPath}/plugins/${pluginAuthor}/${pluginName}`).isDirectory) continue;
      pluginNames.push(pluginName);
    }
    if (pluginNames.length > 0) {
      systemsById[systemId].plugins[pluginAuthor] = pluginNames;
    }
  }
}

const command = argv._[0];
const [ systemId, pluginFullName ] = argv._[1] != null ? argv._[1].split(":") : [ null, null ];
switch (command) {
  case "start":
    /* tslint:disable */
    require("./start").default(dataPath);
    /* tslint:enable */
    break;
  case "list": list(); break;
  case "registry": showRegistry(); break;
  case "install": install(); break;
  case "uninstall": uninstall(); break;
  case "update": update(); break;
  case "init": init(); break;
  default:
    yargs.showHelp();
    process.exit(1);
    break;
}

function list() {
  for (const systemId in systemsById) {
    const system = systemsById[systemId];
    console.log(`System "${systemId}" installed in folder "${system.folderName}".`);

    const pluginAuthors = Object.keys(system.plugins);
    if (pluginAuthors.length === 0) {
      console.log("No external plugins installed.");
    } else {
      for (const pluginAuthor of pluginAuthors) {
        console.log(`  ${pluginAuthor}/`);
        for (const pluginName of system.plugins[pluginAuthor]) console.log(`    ${pluginName}`);
      }
    }
    console.log("");
  }
}

const currentRegistryVersion = 1;
type Registry = { version: number; systems: { [sytemId: string]: { repository: string; plugins: { [author: string]: { [name: string]: string } } } } };
function getRegistry(callback: (err: Error, registry: Registry) => any) {
  // FIXME: Use registry.json instead once the next release is out
  const registryUrl = "https://raw.githubusercontent.com/superpowers/superpowers-core/master/registryNext.json";
  const request = https.get(registryUrl, (res) => {
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

function showRegistry() {
  getRegistry((err, registry) => {
    for (const systemId in registry.systems) {
      listAvailablePlugins(registry, systemId);
      console.log("");
    }
  });
}

function listAvailableSystems(registry: Registry) { console.log(`Available systems: ${Object.keys(registry.systems).join(", ")}.`); }
function listAvailablePlugins(registry: Registry, systemId: string) {
  const pluginAuthors = Object.keys(registry.systems[systemId].plugins);
  if (pluginAuthors.length === 0) {
    console.log(`${systemId}: No plugins found.`);
  } else {
    let pluginCount = 0;
    for (const pluginAuthor of pluginAuthors) pluginCount += Object.keys(registry.systems[systemId].plugins[pluginAuthor]).length;

    console.log(`${systemId}: ${pluginCount} plugin${pluginCount !== 1 ? "s" : ""} found.`);
    for (const pluginAuthor of pluginAuthors) {
      console.log(`  ${pluginAuthor}/`);
      for (const pluginName of Object.keys(registry.systems[systemId].plugins[pluginAuthor])) console.log(`    ${pluginName}`);
    }
  }
}

function getLatestRelease(repositoryURL: string, callback: (version: string, downloadURL: string) => void) {
  const repositoryPath = `${repositoryURL.replace("https://github.com", "/repos")}/releases/latest`;
  const request = https.get({
    hostname: "api.github.com",
    path: repositoryPath,
    headers: { "user-agent": "Superpowers" }
  }, (res) => {
    if (res.statusCode !== 200) {
      console.error(`Couldn't get latest release from repository at ${repositoryURL}:`);
      const err = new Error(`Unexpected status code: ${res.statusCode}`);
      console.error(err.stack);
      process.exit(1);
    }

    let content = "";
    res.on("data", (chunk: string) => { content += chunk; });
    res.on("end", () => {
      const repositoryInfo = JSON.parse(content);
      callback(repositoryInfo.tag_name.slice(1), repositoryInfo.assets[0].browser_download_url);
    });
  });

  request.on("error", (err: Error) => {
    console.error(`Couldn't get latest release from repository at ${repositoryURL}:`);
    console.error(err.stack);
    process.exit(1);
  });
}

function downloadRelease(downloadURL: string, downloadPath: string, callback: () => void) {
  mkdirp.sync(downloadPath);
  https.get({
    hostname: "github.com",
    path: downloadURL,
    headers: { "user-agent": "Superpowers" }
  }, (res) => {
    if (res.statusCode !== 200) {
      console.error("Couldn't download the release:");
      const err = new Error(`Unexpected status code: ${res.statusCode}`);
      console.error(err.stack);
      process.exit(1);
    }

    let rootFolderName: string;
    res.pipe(unzip.Parse())
      .on("entry", (entry: any) => {
        if (rootFolderName == null) {
          rootFolderName = entry.path;
          return;
        }

        const entryPath = `${downloadPath}/${entry.path.replace(rootFolderName, "")}`;
        if (entry.type === "Directory") mkdirp.sync(entryPath);
        else entry.pipe(fs.createWriteStream(entryPath));
      })
      .on("close", () => { callback(); });
  });
}

function install() {
  getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    if (registry.systems[systemId] == null) {
      console.error(`System ${systemId} is not on the registry.`);
      listAvailableSystems(registry);
      process.exit(1);
    }

    if (systemsById[systemId] != null) {
      if (pluginFullName == null) {
        console.error(`System ${systemId} is already installed.`);
        listAvailableSystems(registry);
        process.exit(1);
      } else if (pluginFullName === "") {
        listAvailablePlugins(registry, systemId);
        process.exit(0);
      }

      const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
      if (registry.systems[systemId].plugins[pluginAuthor] == null || registry.systems[systemId].plugins[pluginAuthor][pluginName] == null) {
        console.error(`Plugin ${pluginFullName} is not on the registry.`);
        listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      if (systemsById[systemId].plugins[pluginAuthor] != null && systemsById[systemId].plugins[pluginAuthor].indexOf(pluginName) !== -1) {
        console.error(`Plugin ${pluginFullName} is already installed.`);
        listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      installPlugin(registry.systems[systemId].plugins[pluginAuthor][pluginName]);
    } else {
      if (pluginFullName != null) {
        console.error(`System ${systemId} is not installed.`);
        process.exit(1);
      }

      installSystem(registry.systems[systemId].repository);
    }
  });
}

function installSystem(repositoryURL: string) {
  console.log(`Installing system ${systemId}...`);
  getLatestRelease(repositoryURL, (version, downloadURL) => {
    const systemPath = `${systemsPath}/${systemId}`;
    downloadRelease(downloadURL, systemPath, () => {
      console.log("System successfully installed.");
    });
  });
}

function installPlugin(repositoryURL: string) {
  console.log(`Installing plugin ${pluginFullName} on system ${systemId}...`);
  getLatestRelease(repositoryURL, (version, downloadURL) => {
    const pluginPath = `${systemsPath}/${systemsById[systemId].folderName}/plugins/${pluginFullName}`;
    downloadRelease(downloadURL, pluginPath, () => {
      console.log("Plugin successfully installed.");
    });
  });
}

function uninstall() {
  const system = systemsById[systemId];
  if (system == null) {
    console.error(`System ${systemId} is not installed.`);
    process.exit(1);
  }

  if (pluginFullName == null) {
    const r1 = readline.createInterface({ input: process.stdin, output: process.stdout });
    r1.question(`Are you sure you want to uninstall the system ${systemId} ? (yes/no): `, (answer) => {
      if (answer === "yes") uninstallSystem(system.folderName);
      else process.exit(0);
    });

  } else {
    const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
    if (builtInPluginAuthors.indexOf(pluginAuthor) !== -1) {
      console.error(`Built-in plugins can not be uninstalled.`);
      process.exit(1);
    }

    if (system.plugins[pluginAuthor] == null || system.plugins[pluginAuthor].indexOf(pluginName) === -1) {
      console.error(`Plugin ${pluginFullName} is not installed.`);
      process.exit(1);
    }

    const r1 = readline.createInterface({ input: process.stdin, output: process.stdout });
    r1.question(`Are you sure you want to uninstall the plugin ${pluginFullName} ? (yes/no): `, (answer) => {
      if (answer === "yes") uninstallPlugin(system.folderName, pluginAuthor);
      else process.exit(0);
    });
  }
}

function uninstallSystem(systemFolderName: string) {
  console.log(`Uninstalling system ${systemId}...`);
  rimraf(`${systemsPath}/${systemFolderName}`, (err) => {
    if (err != null) {
      console.error(`Failed to uninstalled system.`);
      process.exit(1);
    } else {
      console.log("System successfully uninstalled.");
    }
  });
}

function uninstallPlugin(systemFolderName: string, pluginAuthor: string) {
  console.log(`Uninstalling plugin ${pluginFullName} from system ${systemId}...`);
  rimraf(`${systemsPath}/${systemFolderName}/plugins/${pluginFullName}`, (err) => {
    if (err != null) {
      console.error(`Failed to uninstalled plugin.`);
      process.exit(1);
    } else {
      if (fs.readdirSync(`${systemsPath}/${systemFolderName}/plugins/${pluginAuthor}`).length === 0)
        fs.rmdirSync(`${systemsPath}/${systemFolderName}/plugins/${pluginAuthor}`);

      console.log("Plugin successfully uninstalled.");
      process.exit(0);
    }
  });
}

function update() {
  if (argv._[1] === "server") {
    // FIXME: Remove the 2 following lines once we have a release ready
    console.log("The server can't be updated yet.");
    process.exit(0);
    updateServer();
    return;
  }

  const system = systemsById[systemId];
  if (system == null) {
    console.error(`System ${systemId} is not installed.`);
    process.exit(1);
  }

  if (pluginFullName == null) {
    updateSystem(system.folderName);

  } else {
    const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
    if (builtInPluginAuthors.indexOf(pluginAuthor) !== -1) {
      console.error(`Built-in plugins can not be update on their own. You must update the system instad.`);
      process.exit(1);
    }

    if (system.plugins[pluginAuthor] == null || system.plugins[pluginAuthor].indexOf(pluginName) === -1) {
      console.error(`Plugin ${pluginFullName} is not installed.`);
      process.exit(1);
    }
    updatePlugin(system.folderName);
  }
}

function updateServer() {
  const packageData = fs.readFileSync(`${__dirname}/../package.json`, { encoding: "utf8" });
  const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

  getLatestRelease("https://github.com/superpowers/superpowers-core", (version, downloadURL) => {
    const [ latestMajor, latestMinor ] = version.split(".");

    if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
      console.log("Updating the server...");

      for (let path of ["server", "SupClient", "SupCore", "package.json", "public", "node_modules"]) rimraf.sync(`${__dirname}/../${path}`);
      downloadRelease(downloadURL, `${__dirname}/..`, () => {
        console.log("Server successfully updated.");
      });
    } else {
      console.log("No updates available for the server.");
    }
  });
}

function updateSystem(systemFolderName: string) {
  const systemPath = `${systemsPath}/${systemFolderName}`;
  const packageData = fs.readFileSync(`${systemPath}/package.json`, { encoding: "utf8" });
  const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

  getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    const system = registry.systems[systemId];
    if (system == null) {
      console.error(`System ${systemId} is not on the registry.`);
      listAvailableSystems(registry);
      process.exit(1);
    }

    getLatestRelease(system.repository, (version, downloadURL) => {
      const [ latestMajor, latestMinor ] = version.split(".");
      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        console.log(`Updating system ${systemId}...`);

        const folders = fs.readdirSync(systemPath);
        for (let folder of folders) {
          if (folder === "plugins") {
            for (const pluginAuthor of fs.readdirSync(`${systemPath}/plugins`)) {
              if (builtInPluginAuthors.indexOf(pluginAuthor) === -1) continue;
              rimraf.sync(`${systemPath}/plugins/${pluginAuthor}`);
            }
          } else rimraf.sync(`${systemPath}/${folder}`);
        }

        downloadRelease(downloadURL, systemPath, () => {
          console.log(`System successfully updated to version ${latestMajor}.${latestMinor}.`);
        });
      } else {
        console.log(`No updates available for system ${systemId}`);
      }
    });
  });
}

function updatePlugin(systemFolderName: string) {
  const pluginPath = `${systemsPath}/${systemFolderName}/plugins/${pluginFullName}`;
  const packageData = fs.readFileSync(`${pluginPath}/package.json`, { encoding: "utf8" });
  const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

  getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    const system = registry.systems[systemId];
    if (system == null) {
      console.error(`System ${systemId} is not on the registry.`);
      listAvailableSystems(registry);
      process.exit(1);
    }

    const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
    if (system.plugins[pluginAuthor] == null || system.plugins[pluginAuthor][pluginName] == null) {
      console.error(`Plugin ${pluginFullName} is not on the registry.`);
      listAvailablePlugins(registry, systemId);
      process.exit(1);
    }

    getLatestRelease(system.plugins[pluginAuthor][pluginName], (version, downloadURL) => {
      const [ latestMajor, latestMinor ] = version.split(".");
      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        console.log(`Updating plugin ${pluginFullName}...`);

        rimraf.sync(pluginPath);
        downloadRelease(downloadURL, pluginPath, () => {
          console.log(`Plugin successfully updated to version ${latestMajor}.${latestMinor}.`);
        });
      } else {
        console.log(`No updates available for plugin ${pluginFullName}`);
      }
    });
  });
}

function init() {
  if (!folderNameRegex.test(systemId)) {
    console.error("Invalid system ID: only lowercase letters, numbers and dashes are allowed.");
    process.exit(1);
  }

  if (pluginFullName != null && !pluginNameRegex.test(pluginFullName)) {
    console.error("Invalid plugin name: only two sets of letters and numbers separated by a slash are allowed.");
    process.exit(1);
  }

  let systemFolderName = (systemsById[systemId] != null) ? systemsById[systemId].folderName : null;

  if (pluginFullName == null && systemFolderName != null) {
    console.error(`You already have a system with the ID ${systemId} installed as systems/${systemFolderName}.`);
    process.exit(1);
  } else if (pluginFullName != null && systemFolderName == null) {
    console.error(`You don't have a system with the ID ${systemId} installed.`);
    process.exit(1);
  }

  if (systemFolderName == null) systemFolderName = systemId;

  let systemStats: fs.Stats;
  try { systemStats = fs.lstatSync(`${systemsPath}/${systemFolderName}`); } catch (err) { /* Ignore */ }

  if (pluginFullName == null) {
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
    try { pluginStats = fs.lstatSync(`${systemsPath}/${systemFolderName}/plugins/${pluginFullName}`); } catch (err) { /* Ignore */ }
    if (pluginStats != null) {
      console.error(`systems/${systemFolderName}/plugins/${pluginFullName} already exists.`);
      process.exit(1);
    }
  }

  getRegistry((err, registry) => {
    const registrySystemEntry = registry.systems[systemId];
    if (pluginFullName == null && registrySystemEntry != null) {
      console.error(`System ${systemId} already exists.`);
      process.exit(1);
    } else if (pluginFullName != null && registrySystemEntry != null) {
      const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
      if (registrySystemEntry.plugins[pluginAuthor][pluginName] != null) {
        console.error(`Plugin ${pluginFullName} on system ${systemId} already exists.`);
        process.exit(1);
      }
    }

    if (pluginFullName == null) initSystem(systemId);
    else initPlugin(systemFolderName, systemId, pluginFullName);
  });
}

function initSystem(systemId: string) {
  const packageJSON = JSON.stringify({
    name: `superpowers-${systemId}`,
    description: "A system for Superpowers, the HTML5 app for real-time collaborative projects",
    superpowers: {
      systemId: systemId,
      publishedPluginBundles: []
    }
  }, null, 2) + "\n";

  const systemPath = `${systemsPath}/${systemId}`;
  fs.mkdirSync(systemPath);
  fs.writeFileSync(`${systemPath}/package.json`, packageJSON);

  const localeJSON = JSON.stringify({
    title: `${systemId}`,
    description: `(Edit systems/${systemId}/public/locales/en/system.json to change the title and description)`
  }, null, 2) + "\n";
  mkdirp.sync(`${systemPath}/public/locales/en`);
  fs.writeFileSync(`${systemPath}/public/locales/en/system.json`, localeJSON);

  console.log(`A system named ${systemId} has been initialized.`);
}

function initPlugin(systemFolderName: string, systemId: string, pluginName: string) {
  const pluginSlug = pluginName.replace(/\//g, "-").replace(/[A-Z]/g, (x) => `-${x.toLowerCase()}`);
  const packageJSON = JSON.stringify({
    name: `superpowers-${systemId}-${pluginSlug}-plugin`,
    description: `Plugin for Superpowers ${systemId}`,
    scripts: {
      "build": "gulp --gulpfile=../../../../../scripts/pluginGulpfile.js --cwd=."
    }
  }, null, 2) + "\n";

  const pluginPath = `${systemsPath}/${systemFolderName}/plugins/${pluginName}`;
  mkdirp.sync(pluginPath);
  fs.writeFileSync(`${pluginPath}/package.json`, packageJSON);

  const tsconfigJSON = JSON.stringify({
    "compilerOptions": {
      "module": "commonjs",
      "target": "es5",
      "noImplicitAny": true
    }
  }, null, 2) + "\n";
  fs.writeFileSync(`${pluginPath}/tsconfig.json`, tsconfigJSON);

  const indexDTS = `/// <reference path="../../../../../SupClient/SupClient.d.ts" />
/// <reference path="../../../../../SupCore/SupCore.d.ts" />
`;
  fs.writeFileSync(`${pluginPath}/index.d.ts`, indexDTS);

  console.log(`A plugin named ${pluginName} has been initialized in systems/${systemFolderName}.`);
}
