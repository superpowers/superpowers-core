import * as rimraf from "rimraf";
import * as fs from "fs";

import * as utils from "./utils";

export default function update(systemId: string, pluginFullName: string) {
  if (systemId === "core" && pluginFullName == null) {
    updateCore();
    return;
  }

  const system = utils.systemsById[systemId];
  if (system == null) {
    console.error(`System ${systemId} is not installed.`);
    process.exit(1);
  }

  if (pluginFullName == null) {
    updateSystem(systemId, system.folderName);

  } else {
    const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
    if (utils.builtInPluginAuthors.indexOf(pluginAuthor) !== -1) {
      console.error(`Built-in plugins can not be update on their own. You must update the system instad.`);
      process.exit(1);
    }

    if (system.plugins[pluginAuthor] == null || system.plugins[pluginAuthor].indexOf(pluginName) === -1) {
      console.error(`Plugin ${pluginFullName} is not installed.`);
      process.exit(1);
    }
    updatePlugin(systemId, pluginFullName, system.folderName);
  }
}

function updateCore() {
  const packageData = fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" });
  const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

  utils.getLatestRelease("https://github.com/superpowers/superpowers-core", (version, downloadURL) => {
    const [ latestMajor, latestMinor ] = version.split(".");

    if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
      console.log("Updating the server...");

      for (let path of ["server", "SupClient", "SupCore", "package.json", "public", "node_modules"]) rimraf.sync(`${__dirname}/../../${path}`);
      utils.downloadRelease(downloadURL, `${__dirname}/../..`, () => {
        console.log("Server successfully updated.");
        process.exit(0);
      });
    } else {
      console.log("No updates available for the server.");
      process.exit(0);
    }
  });
}

function updateSystem(systemId: string, systemFolderName: string) {
  const systemPath = `${utils.systemsPath}/${systemFolderName}`;
  const packageData = fs.readFileSync(`${systemPath}/package.json`, { encoding: "utf8" });
  const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

  utils.getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    const system = registry.systems[systemId];
    if (system == null) {
      console.error(`System ${systemId} is not on the registry.`);
      utils.listAvailableSystems(registry);
      process.exit(1);
    }

    utils.getLatestRelease(system.repository, (version, downloadURL) => {
      const [ latestMajor, latestMinor ] = version.split(".");
      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        console.log(`Updating system ${systemId}...`);

        const folders = fs.readdirSync(systemPath);
        for (let folder of folders) {
          if (folder === "plugins") {
            for (const pluginAuthor of fs.readdirSync(`${systemPath}/plugins`)) {
              if (utils.builtInPluginAuthors.indexOf(pluginAuthor) === -1) continue;
              rimraf.sync(`${systemPath}/plugins/${pluginAuthor}`);
            }
          } else rimraf.sync(`${systemPath}/${folder}`);
        }

        utils.downloadRelease(downloadURL, systemPath, () => {
          console.log(`System successfully updated to version ${latestMajor}.${latestMinor}.`);
          process.exit(0);
        });
      } else {
        console.log(`No updates available for system ${systemId}`);
        process.exit(0);
      }
    });
  });
}

function updatePlugin(systemId: string, pluginFullName: string, systemFolderName: string) {
  const pluginPath = `${utils.systemsPath}/${systemFolderName}/plugins/${pluginFullName}`;
  const packageData = fs.readFileSync(`${pluginPath}/package.json`, { encoding: "utf8" });
  const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

  utils.getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    const system = registry.systems[systemId];
    if (system == null) {
      console.error(`System ${systemId} is not on the registry.`);
      utils.listAvailableSystems(registry);
      process.exit(1);
    }

    const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
    if (system.plugins[pluginAuthor] == null || system.plugins[pluginAuthor][pluginName] == null) {
      console.error(`Plugin ${pluginFullName} is not on the registry.`);
      utils.listAvailablePlugins(registry, systemId);
      process.exit(1);
    }

    utils.getLatestRelease(system.plugins[pluginAuthor][pluginName], (version, downloadURL) => {
      const [ latestMajor, latestMinor ] = version.split(".");
      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        console.log(`Updating plugin ${pluginFullName}...`);

        rimraf.sync(pluginPath);
        utils.downloadRelease(downloadURL, pluginPath, () => {
          console.log(`Plugin successfully updated to version ${latestMajor}.${latestMinor}.`);
          process.exit(0);
        });
      } else {
        console.log(`No updates available for plugin ${pluginFullName}`);
        process.exit(0);
      }
    });
  });
}
