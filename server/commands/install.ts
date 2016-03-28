import * as utils from "./utils";

export default function install(systemId: string, pluginFullName: string) {
  utils.getRegistry((err, registry) => {
    if (err) {
      console.error("Error while fetching registry:");
      console.error(err.stack);
      process.exit(1);
    }

    if (registry.systems[systemId] == null) {
      console.error(`System ${systemId} is not on the registry.`);
      utils.listAvailableSystems(registry);
      process.exit(1);
    }

    if (utils.systemsById[systemId] != null) {
      if (pluginFullName == null) {
        console.error(`System ${systemId} is already installed.`);
        utils.listAvailableSystems(registry);
        process.exit(1);
      } else if (pluginFullName === "") {
        utils.listAvailablePlugins(registry, systemId);
        process.exit(0);
      }

      const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
      if (registry.systems[systemId].plugins[pluginAuthor] == null || registry.systems[systemId].plugins[pluginAuthor][pluginName] == null) {
        console.error(`Plugin ${pluginFullName} is not on the registry.`);
        utils.listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      if (utils.systemsById[systemId].plugins[pluginAuthor] != null && utils.systemsById[systemId].plugins[pluginAuthor].indexOf(pluginName) !== -1) {
        console.error(`Plugin ${pluginFullName} is already installed.`);
        utils.listAvailablePlugins(registry, systemId);
        process.exit(1);
      }

      installPlugin(systemId, pluginFullName, registry.systems[systemId].plugins[pluginAuthor][pluginName]);
    } else {
      if (pluginFullName != null) {
        console.error(`System ${systemId} is not installed.`);
        process.exit(1);
      }

      installSystem(systemId, registry.systems[systemId].downloadURL);
    }
  });
}

function installSystem(systemId: string, downloadURL: string) {
  console.log(`Installing system ${systemId}...`);
  const systemPath = `${utils.systemsPath}/${systemId}`;
  utils.downloadRelease(downloadURL, systemPath, () => {
    console.log("System successfully installed.");
    process.exit(0);
  });
}

function installPlugin(systemId: string, pluginFullName: string, repositoryURL: string) {
  console.log(`Installing plugin ${pluginFullName} on system ${systemId}...`);
  utils.getLatestRelease(repositoryURL, (version, downloadURL) => {
    const pluginPath = `${utils.systemsPath}/${utils.systemsById[systemId].folderName}/plugins/${pluginFullName}`;
    utils.downloadRelease(downloadURL, pluginPath, () => {
      console.log("Plugin successfully installed.");
      process.exit(0);
    });
  });
}
