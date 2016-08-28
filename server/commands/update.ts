import * as rimraf from "rimraf";
import * as fs from "fs";
import * as path from "path";

import * as utils from "./utils";

export default function update(systemId: string, pluginFullName: string) {
  // Update core
  if (systemId === "core" && pluginFullName == null) {
    let isDevFolder = true;
    try { fs.readdirSync(path.resolve(`${__dirname}/../../.git`)); } catch (err) { isDevFolder = false; }
    if (isDevFolder) utils.emitError(`Core is a development version.`);

    if (utils.downloadURL != null) {
      updateCore(utils.downloadURL);
      return;
    }

    utils.getRegistry((err, registry) => {
      if (registry.core.version !== registry.core.localVersion) {
        updateCore(registry.core.downloadURL);
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

      if (registrySystem.version !== registrySystem.localVersion) {
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

      if (registryPlugin.version !== registryPlugin.localVersion) {
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

  const corePath = path.resolve(`${__dirname}/../..`);
  const newCorePath = path.resolve(`${__dirname}/../../../core.new`);

  utils.downloadRelease(downloadURL, newCorePath, (err) => {
    if (err != null) utils.emitError("Failed to update the core.", err);

    for (const oldItem of ["client", "node_modules", "public", "server", "SupClient", "SupCore", "LICENSE.txt", "package.json", "README.md" ]) rimraf.sync(`${corePath}/${oldItem}`);
    for (const newItem of fs.readdirSync(newCorePath)) fs.renameSync(`${newCorePath}/${newItem}`, `${corePath}/${newItem}`);
    rimraf.sync(newCorePath);

    console.log("Server successfully updated.");
    process.exit(0);
  });
}

function updateSystem(systemId: string, downloadURL: string) {
  console.log(`Updating system ${systemId}...`);

  const system = utils.systemsById[systemId];

  const systemPath = `${utils.systemsPath}/${system.folderName}`;
  const newSystemPath = `${systemPath}.new`;

  utils.downloadRelease(downloadURL, newSystemPath, (err) => {
    if (err != null) utils.emitError("Failed to update the system.", err);

    for (const oldItem of fs.readdirSync(systemPath)) {
      if (oldItem === "plugins") {
        for (const pluginAuthor of fs.readdirSync(`${systemPath}/plugins`)) {
          if (utils.builtInPluginAuthors.indexOf(pluginAuthor) === -1) continue;
          rimraf.sync(`${systemPath}/plugins/${pluginAuthor}`);
        }
      } else {
        rimraf.sync(`${systemPath}/${oldItem}`);
      }
    }

    for (const newItem of fs.readdirSync(newSystemPath)) {
      if (newItem === "plugins") {
        for (const pluginAuthor of fs.readdirSync(`${newSystemPath}/plugins`)) {
          if (utils.builtInPluginAuthors.indexOf(pluginAuthor) === -1) continue;
          fs.renameSync(`${newSystemPath}/plugins/${pluginAuthor}`, `${systemPath}/plugins/${pluginAuthor}`);
        }
      } else {
        fs.renameSync(`${newSystemPath}/${newItem}`, `${systemPath}/${newItem}`);
      }
    }
    rimraf.sync(newSystemPath);

    console.log(`System successfully updated.`);
    process.exit(0);
  });
}

function updatePlugin(systemId: string, pluginFullName: string, downloadURL: string) {
  console.log(`Updating plugin ${pluginFullName}...`);

  const pluginPath = `${utils.systemsPath}/${utils.systemsById[systemId].folderName}/plugins/${pluginFullName}`;
  const newPluginPath = `${pluginPath}.new`;

  utils.downloadRelease(downloadURL, newPluginPath, (err) => {
    if (err != null) utils.emitError("Failed to update the plugin.", err);

    rimraf.sync(pluginPath);
    fs.renameSync(newPluginPath, pluginPath);

    console.log(`Plugin successfully updated.`);
    process.exit(0);
  });
}
