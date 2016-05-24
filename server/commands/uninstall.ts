import * as readline from "readline";
import * as rimraf from "rimraf";
import * as fs from "fs";

import * as utils from "./utils";

export default function uninstall(systemId: string, pluginFullName: string) {
  const system = utils.systemsById[systemId];
  if (system == null) utils.emitError(`System ${systemId} is not installed.`);

  if (pluginFullName == null) {
    if (system.isDev) utils.emitError(`System ${systemId} is a development version.`);

    if (utils.force) {
      uninstallSystem(system.folderName);
      return;
    }

    const r1 = readline.createInterface({ input: process.stdin, output: process.stdout });
    r1.question(`Are you sure you want to uninstall the system ${systemId}? (yes/no): `, (answer) => {
      if (answer === "yes") {
        console.log(`Uninstalling system ${systemId}...`);
        uninstallSystem(system.folderName);
      } else {
        console.log(`Uninstall canceled.`);
        process.exit(0);
      }
    });

  } else {
    const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
    if (utils.builtInPluginAuthors.indexOf(pluginAuthor) !== -1) utils.emitError(`Built-in plugins can not be uninstalled.`);

    if (system.plugins[pluginAuthor] == null || system.plugins[pluginAuthor].indexOf(pluginName) === -1)
      utils.emitError(`Plugin ${pluginFullName} is not installed.`);

    let isDevFolder = true;
    try { fs.readdirSync(`${utils.systemsPath}/${system.folderName}/plugins/${pluginFullName}/.git`); } catch (err) { isDevFolder = false; }
    if (isDevFolder) utils.emitError(`Plugin ${pluginFullName} is a development version.`);

    if (utils.force) {
      uninstallPlugin(system.folderName, pluginFullName, pluginAuthor);
      return;
    }

    const r1 = readline.createInterface({ input: process.stdin, output: process.stdout });
    r1.question(`Are you sure you want to uninstall the plugin ${pluginFullName}? (yes/no): `, (answer) => {
      if (answer === "yes") {
        console.log(`Uninstalling plugin ${pluginFullName} from system ${systemId}...`);
        uninstallPlugin(system.folderName, pluginFullName, pluginAuthor);
      } else {
        console.log(`Uninstall canceled.`);
        process.exit(0);
      }
    });
  }
}

function uninstallSystem(systemFolderName: string) {
  rimraf(`${utils.systemsPath}/${systemFolderName}`, (err) => {
    if (err != null) {
      utils.emitError(`Failed to uninstalled system.`);
    } else {
      console.log("System successfully uninstalled.");
      process.exit(0);
    }
  });
}

function uninstallPlugin(systemFolderName: string, pluginFullName: string, pluginAuthor: string) {
  rimraf(`${utils.systemsPath}/${systemFolderName}/plugins/${pluginFullName}`, (err) => {
    if (err != null) {
      utils.emitError(`Failed to uninstalled plugin.`);
    } else {
      if (fs.readdirSync(`${utils.systemsPath}/${systemFolderName}/plugins/${pluginAuthor}`).length === 0)
        fs.rmdirSync(`${utils.systemsPath}/${systemFolderName}/plugins/${pluginAuthor}`);

      console.log("Plugin successfully uninstalled.");
      process.exit(0);
    }
  });
}
