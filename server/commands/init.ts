import * as fs from "fs";
import * as mkdirp from "mkdirp";

import * as utils from "./utils";

export default function init(systemId: string, pluginFullName: string) {
  if (!utils.folderNameRegex.test(systemId))
    utils.emitError("Invalid system ID: only lowercase letters, numbers and dashes are allowed.");

  if (pluginFullName != null && !utils.pluginNameRegex.test(pluginFullName))
    utils.emitError("Invalid plugin name: only two sets of letters and numbers separated by a slash are allowed.");

  let systemFolderName = (utils.systemsById[systemId] != null) ? utils.systemsById[systemId].folderName : null;

  if (pluginFullName == null && systemFolderName != null)
    utils.emitError(`You already have a system with the ID ${systemId} installed as systems/${systemFolderName}.`);
  else if (pluginFullName != null && systemFolderName == null)
    utils.emitError(`You don't have a system with the ID ${systemId} installed.`);

  if (systemFolderName == null) systemFolderName = systemId;

  let systemStats: fs.Stats;
  try { systemStats = fs.lstatSync(`${utils.systemsPath}/${systemFolderName}`); } catch (err) { /* Ignore */ }

  if (pluginFullName == null) {
    if (systemStats != null) utils.emitError(`systems/${systemFolderName} already exists.`);
  } else {
    if (systemStats == null) utils.emitError(`systems/${systemFolderName} doesn't exist.`);

    let pluginStats: fs.Stats;
    try { pluginStats = fs.lstatSync(`${utils.systemsPath}/${systemFolderName}/plugins/${pluginFullName}`); } catch (err) { /* Ignore */ }
    if (pluginStats != null) utils.emitError(`systems/${systemFolderName}/plugins/${pluginFullName} already exists.`);
  }

  utils.getRegistry((err, registry) => {
    const registrySystemEntry = registry.systems[systemId];
    if (pluginFullName == null && registrySystemEntry != null) {
      utils.emitError(`System ${systemId} already exists.`);
    } else if (pluginFullName != null && registrySystemEntry != null) {
      const [ pluginAuthor, pluginName ] = pluginFullName.split("/");
      if (registrySystemEntry.plugins[pluginAuthor] != null && registrySystemEntry.plugins[pluginAuthor][pluginName] != null)
        utils.emitError(`Plugin ${pluginFullName} on system ${systemId} already exists.`);
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

  const systemPath = `${utils.systemsPath}/${systemId}`;
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

  const pluginPath = `${utils.systemsPath}/${systemFolderName}/plugins/${pluginName}`;
  mkdirp.sync(pluginPath);
  fs.writeFileSync(`${pluginPath}/package.json`, packageJSON);

  const tsconfigJSON = JSON.stringify({
    "compilerOptions": {
      "module": "commonjs",
      "target": "es5",
      "noImplicitAny": true,
      "typeRoots": [ "../../../../../node_modules/@types" ]
    },
    "exclude": [
      "node_modules",
      "typings"
    ]
  }, null, 2) + "\n";
  fs.writeFileSync(`${pluginPath}/tsconfig.json`, tsconfigJSON);

  const indexDTS = `/// <reference path="../../../../../SupClient/SupClient.d.ts" />
/// <reference path="../../../../../SupCore/SupCore.d.ts" />
`;
  fs.writeFileSync(`${pluginPath}/index.d.ts`, indexDTS);

  console.log(`A plugin named ${pluginName} has been initialized in systems/${systemFolderName}.`);
}
