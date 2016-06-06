import * as rimraf from "rimraf";
import * as fs from "fs";

import * as utils from "./utils";

export default function update(systemId: string, pluginFullName: string) {
  if (systemId === "core" && pluginFullName == null) {
    let isDevFolder = true;
    try { fs.readdirSync(`${__dirname}/../../.git`); } catch (err) { isDevFolder = false; }
    if (isDevFolder) utils.emitError(`Core is a development version.`);

    updateCore();
    return;
  }

  const system = utils.systemsById[systemId];
  if (system == null) utils.emitError(`System ${systemId} is not installed.`);

  if (pluginFullName == null) {
    if (system.isDev) utils.emitError(`System ${systemId} is a development version.`);

    if (utils.downloadURL != null) {
      updateSystem(systemId, utils.downloadURL);
      return;
    }

    utils.getRegistry((err, registry) => {
      if (err) utils.emitError("Error while fetching registry:", err.stack);

      const system = registry.systems[systemId];
      if (system == null) {
        console.error(`System ${systemId} is not on the registry.`);
        utils.listAvailableSystems(registry);
        process.exit(1);
      }

      const [ currentMajor, currentMinor ] = system.localVersion.split(".");
      const [ latestMajor, latestMinor ] = system.version.split(".");
      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        updateSystem(systemId, system.downloadURL);
      } else {
        console.log(`No updates available for system ${systemId}`);
        process.exit(0);
      }
    });

  } else {
    const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
    if (utils.builtInPluginAuthors.indexOf(pluginAuthor) !== -1)
      utils.emitError(`Built-in plugins can not be update on their own. You must update the system instad.`);

    if (system.plugins[pluginAuthor] == null || system.plugins[pluginAuthor].indexOf(pluginName) === -1)
      utils.emitError(`Plugin ${pluginFullName} is not installed.`);

    let isDevFolder = true;
    try { fs.readdirSync(`${utils.systemsPath}/${system.folderName}/plugins/${pluginFullName}/.git`); } catch (err) { isDevFolder = false; }
    if (isDevFolder) utils.emitError(`Plugin ${pluginFullName} is a development version.`);

    updatePlugin(systemId, pluginFullName);
  }
}

function updateCore() {
  const packageData = fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" });
  const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

  utils.getLatestRelease("https://github.com/superpowers/superpowers-core", (version, downloadURL) => {
    const [ latestMajor, latestMinor ] = version.split(".");

    if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
      console.log("Updating the server...");

      const newPath = `${__dirname}/../../../core.new`;
      utils.downloadRelease(downloadURL, newPath, (err) => {
        if (err != null) utils.emitError("Failed to update the core.", err);

        for (let path of ["server", "SupClient", "SupCore", "package.json", "public", "node_modules"]) {
          const fullPath = `${__dirname}/../../${path}`;
          rimraf.sync(fullPath);
          fs.renameSync(`${newPath}/${path}`, `${fullPath}A`);
        }
        rimraf.sync(newPath);

        console.log("Server successfully updated.");
        process.exit(0);
      });
    } else {
      console.log("No updates available for the server.");
      process.exit(0);
    }
  });
}

function updateSystem(systemId: string, downloadURL: string) {
  console.log(`Updating system ${systemId}...`);

  const system = utils.systemsById[systemId];
  const systemPath = `${utils.systemsPath}/${system.folderName}`;
  const newSystemPath = `${systemPath}.new`;

  utils.downloadRelease(downloadURL, newSystemPath, (err) => {
    if (err != null) utils.emitError("Failed to update the system.", err);

    const oldItems = fs.readdirSync(systemPath);
    for (const item of oldItems) {
      if (item === "plugins") {
        for (const pluginAuthor of fs.readdirSync(`${systemPath}/plugins`)) {
          if (utils.builtInPluginAuthors.indexOf(pluginAuthor) === -1) continue;
          rimraf.sync(`${systemPath}/plugins/${pluginAuthor}`);
        }
      } else rimraf.sync(`${systemPath}/${item}`);
    }

    const newItems = fs.readdirSync(newSystemPath);
    for (const item of newItems) {
      if (item === "plugins") {
        for (const pluginAuthor of fs.readdirSync(`${newSystemPath}/plugins`)) {
          if (utils.builtInPluginAuthors.indexOf(pluginAuthor) === -1) continue;
          fs.renameSync(`${newSystemPath}/plugins/${pluginAuthor}`, `${systemPath}/plugins/${pluginAuthor}`);
        }
      } else fs.renameSync(`${newSystemPath}/${item}`, `${systemPath}/${item}`);
    }
    rimraf.sync(newSystemPath);

    console.log(`System successfully updated.`);
    process.exit(0);
  });
}

function updatePlugin(systemId: string, pluginFullName: string) {
  const system = utils.systemsById[systemId];
  const pluginPath = `${utils.systemsPath}/${system.folderName}/plugins/${pluginFullName}`;

  utils.getRegistry((err, registry) => {
    if (err) utils.emitError("Error while fetching registry:");

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
      const packageData = fs.readFileSync(`${pluginPath}/package.json`, { encoding: "utf8" });
      const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");
      const [ latestMajor, latestMinor ] = version.split(".");
      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        console.log(`Updating plugin ${pluginFullName}...`);

        utils.downloadRelease(downloadURL, `${pluginPath}.new`, (err) => {
          if (err != null) utils.emitError("Failed to update the plugin.", err);

          rimraf.sync(pluginPath);
          fs.renameSync(`${pluginPath}.new`, pluginPath);

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
