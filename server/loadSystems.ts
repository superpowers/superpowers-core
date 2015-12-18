import * as path from "path";
import * as fs from "fs";
import * as express from "express";
import * as async from "async";
import * as readdirRecursive from "recursive-readdir";
import { getLocalizedFilename } from "./paths";

function shouldIgnorePlugin(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }
// FIXME: Let each system specify the required files? or just assume plugins will do their job
let publicPluginFiles = [ "data", "components", "componentEditors", "settingsEditors", "api", "runtime" ];
let systemsPath = path.resolve(`${__dirname}/../systems`);

export let buildFilesBySystem: { [systemName: string]: string[]; } = {};

export default function(mainApp: express.Express, buildApp: express.Express, callback: Function) {
  async.eachSeries(fs.readdirSync(systemsPath), (systemName, cb) => {
    SupCore.system = SupCore.systems[systemName] = new SupCore.System(systemName);
    let systemPath = path.join(systemsPath, systemName);

    // Expose public stuff
    try { fs.mkdirSync(`${systemPath}/public`); } catch (err) { /* Ignore */ }
    mainApp.use(`/systems/${systemName}`, express.static(`${systemPath}/public`));
    buildApp.use(`/systems/${systemName}`, express.static(`${systemPath}/public`));

    // Write templates list
    let templatesList: string[] = [];
    let templatesFolder = `${systemPath}/public/templates`;
    if (fs.existsSync(templatesFolder))
      templatesList = fs.readdirSync(templatesFolder);
    fs.writeFileSync(`${systemPath}/public/templates.json`, JSON.stringify(templatesList, null, 2));

    // Load plugins
    let pluginsInfo = loadPlugins(systemName, `${systemPath}/plugins`, mainApp, buildApp);
    fs.writeFileSync(`${systemPath}/public/plugins.json`, JSON.stringify(pluginsInfo, null, 2));

    // Build files
    let buildFiles: string[] = buildFilesBySystem[systemName] = [ "/SupCore.js" ];

    for (let plugin of pluginsInfo.list) {
      // FIXME: Let each plugin or system specify the files that should be exported
      buildFiles.push(`/systems/${systemName}/plugins/${plugin}/api.js`);
      buildFiles.push(`/systems/${systemName}/plugins/${plugin}/components.js`);
      buildFiles.push(`/systems/${systemName}/plugins/${plugin}/runtime.js`);
    }

    readdirRecursive(`${systemPath}/public`, (err, entries) => {
      for (let entry of entries) {
        let relativePath = path.relative(`${systemPath}/public`, entry);
        if (relativePath === "manifest.json") continue;
        if (relativePath.slice(0, "templates".length) === "templates") continue;

        buildFiles.push(`/systems/${systemName}/${relativePath}`);
      }

      cb();
    });
  }, () => {
    let systemsInfo: SupCore.SystemsInfo = { list: Object.keys(SupCore.systems) };
    fs.writeFileSync(`${__dirname}/../public/systems.json`, JSON.stringify(systemsInfo, null, 2));

    SupCore.system = null;
    callback();
  });
}

function loadPlugins (systemName: string, pluginsPath: string, mainApp: express.Express, buildApp: express.Express): SupCore.PluginsInfo {
  let pluginNamesByAuthor: { [author: string]: string[] } = {};
  let pluginsInfo: SupCore.PluginsInfo = { list: [], paths: { editors: {}, tools: {} } };

  let pluginsFolder: string[];
  try { pluginsFolder = fs.readdirSync(pluginsPath); } catch (err) { /* Ignore */ }
  if (pluginsFolder == null) return pluginsInfo;

  for (let pluginAuthor of pluginsFolder) {
    let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;

    pluginNamesByAuthor[pluginAuthor] = [];
    for (let pluginName of fs.readdirSync(pluginAuthorPath)) {
      if (shouldIgnorePlugin(pluginName)) continue;
      pluginNamesByAuthor[pluginAuthor].push(pluginName);
    }
  }

  // First pass
  for (let pluginAuthor in pluginNamesByAuthor) {
    let pluginNames = pluginNamesByAuthor[pluginAuthor];
    let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;

    for (let pluginName of pluginNames) {
      let pluginPath = `${pluginAuthorPath}/${pluginName}`;

      // Load scripting API module
      let apiModulePath = `${pluginPath}/api/index.js`;
      if (fs.existsSync(apiModulePath)) require(apiModulePath);

      // Ensure all public files exist
      try { fs.mkdirSync(`${pluginPath}/public`); } catch (err) { /* Ignore */ }
      for (let requiredFile of publicPluginFiles) {
        let requiredFilePath = `${pluginPath}/public/${requiredFile}.js`;
        if (!fs.existsSync(requiredFilePath)) fs.closeSync(fs.openSync(requiredFilePath, "w"));
      }
    }
  }

  // Second pass, because data modules might depend on API modules
  Object.keys(pluginNamesByAuthor).forEach((pluginAuthor) => {
    let pluginNames = pluginNamesByAuthor[pluginAuthor];
    let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;

    pluginNames.forEach((pluginName) => {
      let pluginPath = `${pluginAuthorPath}/${pluginName}`;

      // Load data module
      let dataModulePath = `${pluginPath}/data/index.js`;
      if (fs.existsSync(dataModulePath)) require(dataModulePath);

      // Collect plugin info
      pluginsInfo.list.push(`${pluginAuthor}/${pluginName}`);
      if (fs.existsSync(`${pluginPath}/public/editors`)) {
        let editors = fs.readdirSync(`${pluginPath}/public/editors`);
        editors.forEach((editorName) => {
          if (SupCore.system.data.assetClasses[editorName] != null) {
            pluginsInfo.paths.editors[editorName] = `${pluginAuthor}/${pluginName}`;
          } else {
            pluginsInfo.paths.tools[editorName] = `${pluginAuthor}/${pluginName}`;
          }

          mainApp.get(`/systems/${systemName}/plugins/${pluginAuthor}/${pluginName}/editors/${editorName}`, (req, res) => {
            let language = req.cookies["supLanguage"];
            let editorPath = path.join(pluginPath, "public/editors", editorName);
            let localizedIndexFilename = getLocalizedFilename("index.html", language);
            fs.exists(path.join(editorPath, localizedIndexFilename), (exists) => {
              if (exists) res.sendFile(path.join(editorPath, localizedIndexFilename));
              else res.sendFile(path.join(editorPath, `index.html`));
            });
          });
        });
      }

      // Expose public stuff
      mainApp.get(`/systems/${systemName}/plugins/${pluginAuthor}/${pluginName}/locales/*.json`, (req, res) => {
        let localeFile = req.path.split("/locales/")[1];
        let localePath = path.join(pluginPath, "public/locales", localeFile);
        fs.exists(localePath, (exists) => {
          if (exists) res.sendFile(localePath);
          else res.send("{}");
        });
      });

      mainApp.use(`/systems/${systemName}/plugins/${pluginAuthor}/${pluginName}`, express.static(`${pluginPath}/public`));
      buildApp.use(`/systems/${systemName}/plugins/${pluginAuthor}/${pluginName}`, express.static(`${pluginPath}/public`));
    });
  });

  return pluginsInfo;
}
