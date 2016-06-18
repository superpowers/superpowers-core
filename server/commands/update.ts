import * as rimraf from "rimraf";
import * as fs from "fs";

import * as utils from "./utils";

export default function update(systemId: string, pluginFullName: string) {
  // Update core
  if (systemId === "core" && pluginFullName == null) {
    let isDevFolder = true;
    try { fs.readdirSync(`${__dirname}/../../.git`); } catch (err) { isDevFolder = false; }
    if (isDevFolder) utils.emitError(`Core is a development version.`);

    if (utils.downloadURL != null) {
      updateCore(utils.downloadURL);
      return;
    }

    const packageData = fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" });
    const [ currentMajor, currentMinor ] = JSON.parse(packageData).version.split(".");

    utils.getLatestRelease("https://github.com/superpowers/superpowers-core", (version, downloadURL) => {
      const [ latestMajor, latestMinor ] = version.split(".");

      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        updateCore(downloadURL);
      } else {
        console.log("No updates available for the server.");
        process.exit(0);
      }
    });
    return;
  }

  const localSystem = utils.systemsById[systemId];
  if (localSystem == null) utils.emitError(`System ${systemId} is not installed.`);

  if (pluginFullName == null) {
    // Update system
    if (localSystem.isDev) utils.emitError(`System ${systemId} is a development version.`);

    if (utils.downloadURL != null) {
      updateSystem(systemId, utils.downloadURL);
      return;
    }

    utils.getRegistry((err, registry) => {
      if (err) utils.emitError("Error while fetching registry:", err.stack);

      const registrySystem = registry.systems[systemId];
      if (registrySystem == null) {
        console.error(`System ${systemId} is not on the registry.`);
        utils.listAvailableSystems(registry);
        process.exit(1);
      }

      const [ currentMajor, currentMinor ] = registrySystem.localVersion.split(".");
      const [ latestMajor, latestMinor ] = registrySystem.version.split(".");

      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        updateSystem(systemId, registrySystem.downloadURL);
      } else {
        console.log(`No updates available for system ${systemId}`);
        process.exit(0);
      }
    });

  } else {
    // Update plugin
    const [ authorName, pluginName ] = pluginFullName.split("/");
    if (utils.builtInPluginAuthors.indexOf(authorName) !== -1)
      utils.emitError(`Built-in plugins can not be updated on their own. You must update the system instad.`);

    const localPlugin = localSystem.plugins[authorName] != null ? localSystem.plugins[authorName][pluginName] : null;
    if (localPlugin == null) utils.emitError(`Plugin ${pluginFullName} is not installed.`);

    if (localPlugin.isDev) utils.emitError(`Plugin ${pluginFullName} is a development version.`);

    if (utils.downloadURL != null) {
      updatePlugin(systemId, pluginFullName, utils.downloadURL);
      return;
    }

    utils.getRegistry((err, registry) => {
      if (err != null) utils.emitError("Error while fetching registry:");

      const registrySystem = registry.systems[systemId];
      if (registrySystem == null) {
        console.error(`System ${systemId} is not on the registry.`);
        utils.listAvailableSystems(registry);
        process.exit(1);
      }

      const registryPlugin = registrySystem.plugins[authorName] != null ? registrySystem.plugins[authorName][pluginName] : null;
      if (registryPlugin == null) {
        console.error(`Plugin ${pluginFullName} is not on the registry.`);
        utils.listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      const [ currentMajor, currentMinor ] = registryPlugin.localVersion.split(".");
      const [ latestMajor, latestMinor ] = registryPlugin.version.split(".");

      if (latestMajor > currentMajor || (latestMajor === currentMajor && latestMinor > currentMinor)) {
        updatePlugin(systemId, pluginFullName, registryPlugin.downloadURL);
      } else {
        console.log(`No updates available for plugin ${pluginFullName}`);
        process.exit(0);
      }
    });
  }
}

function updateCore(downloadURL: string) {
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
}

function updateSystem(systemId: string, downloadURL: string) {
  console.log(`Updating system ${systemId}...`);

  const system = utils.systemsById[systemId];
  const systemPath = `${utils.systemsPath}/${system.folderName}`;

  const folders = fs.readdirSync(systemPath);
  for (let folder of folders) {
    if (folder === "plugins") {
      for (const pluginAuthor of fs.readdirSync(`${systemPath}/plugins`)) {
        if (utils.builtInPluginAuthors.indexOf(pluginAuthor) === -1) continue;
        rimraf.sync(`${systemPath}/plugins/${pluginAuthor}`);
      }
    } else rimraf.sync(`${systemPath}/${folder}`);
  }

  utils.downloadRelease(downloadURL, systemPath, (err) => {
    if (err != null) utils.emitError("Failed to update the system.", err);

    console.log(`System successfully updated.`);
    process.exit(0);
  });
}

function updatePlugin(systemId: string, pluginFullName: string, downloadURL: string) {
  console.log(`Updating plugin ${pluginFullName}...`);

  const pluginPath = `${utils.systemsPath}/${utils.systemsById[systemId].folderName}/plugins/${pluginFullName}`;

  utils.downloadRelease(downloadURL, `${pluginPath}.new`, (err) => {
    if (err != null) utils.emitError("Failed to update the plugin.", err);

    rimraf.sync(pluginPath);
    fs.renameSync(`${pluginPath}.new`, pluginPath);

    console.log(`Plugin successfully updated.`);
    process.exit(0);
  });
}
