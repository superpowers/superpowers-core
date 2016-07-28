import * as utils from "./utils";

export default function install(systemId: string, pluginFullName: string) {
  const localSystem = utils.systemsById[systemId];

  if (utils.downloadURL != null) {
    if (pluginFullName == null) {
      if (localSystem != null) utils.emitError(`System ${systemId} is already installed.`);

      installSystem(systemId, utils.downloadURL);

    } else {
      const [ authorName, pluginName ] = pluginFullName.split("/");
      const localPlugin = localSystem != null && localSystem.plugins[authorName] != null ? localSystem.plugins[authorName][pluginName] : null;

      if (localPlugin != null) utils.emitError(`Plugin ${pluginFullName} is already installed.`);

      installPlugin(systemId, pluginFullName, utils.downloadURL);
    }
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

    if (localSystem != null) {
      if (pluginFullName == null) {
        console.error(`System ${systemId} is already installed.`);
        utils.listAvailableSystems(registry);
        process.exit(1);
      } else if (pluginFullName === "") {
        utils.listAvailablePlugins(registry, systemId);
        process.exit(0);
      }

      const [ authorName, pluginName ] = pluginFullName.split("/");
      const localPlugin = localSystem != null && localSystem.plugins[authorName] != null ? localSystem.plugins[authorName][pluginName] : null;

      const registryPlugin = registrySystem.plugins[authorName] != null ? registrySystem.plugins[authorName][pluginName] : null;
      if (registryPlugin == null) {
        console.error(`Plugin ${pluginFullName} is not on the registry.`);
        utils.listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      if (localPlugin != null) {
        console.error(`Plugin ${pluginFullName} is already installed.`);
        utils.listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      installPlugin(systemId, pluginFullName, registryPlugin.downloadURL);
    } else {
      if (pluginFullName != null) utils.emitError(`System ${systemId} is not installed.`);

      installSystem(systemId, registrySystem.downloadURL);
    }
  });
}

function installSystem(systemId: string, downloadURL: string) {
  console.log(`Installing system ${systemId}...`);
  const systemPath = `${utils.systemsPath}/${systemId}`;

  utils.downloadRelease(downloadURL, systemPath, (err) => {
    if (err != null) utils.emitError("Failed to install the system.", err);

    console.log("System successfully installed.");
    process.exit(0);
  });
}

function installPlugin(systemId: string, pluginFullName: string, downloadURL: string) {
  console.log(`Installing plugin ${pluginFullName} on system ${systemId}...`);
  const pluginPath = `${utils.systemsPath}/${utils.systemsById[systemId].folderName}/plugins/${pluginFullName}`;
  utils.downloadRelease(downloadURL, pluginPath, (err) => {
    if (err != null) utils.emitError("Failed to install the plugin.", err);

    console.log("Plugin successfully installed.");
    process.exit(0);
  });
}
