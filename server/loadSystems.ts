import * as path from "path";
import * as fs from "fs";
import * as express from "express";
import * as async from "async";
import * as readdirRecursive from "recursive-readdir";
import { getLocalizedFilename } from "./paths";

function shouldIgnoreFolder(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }
let systemsPath = path.resolve(`${__dirname}/../systems`);

export let buildFilesBySystem: { [systemId: string]: string[]; } = {};

export default function(mainApp: express.Express, buildApp: express.Express, callback: Function) {
  async.eachSeries(fs.readdirSync(systemsPath), (systemFolderName, cb) => {
    if (systemFolderName.indexOf(".") !== -1) { cb(); return; }

    let systemPath = path.join(systemsPath, systemFolderName);
    if (!fs.statSync(systemPath).isDirectory()) { cb(); return; }

    let systemId = JSON.parse(fs.readFileSync(path.join(systemsPath, systemFolderName, "package.json"), { encoding: "utf8" })).superpowers.systemId;
    SupCore.system = SupCore.systems[systemId] = new SupCore.System(systemId, systemFolderName);

    // Expose public stuff
    try { fs.mkdirSync(`${systemPath}/public`); } catch (err) { /* Ignore */ }
    mainApp.use(`/systems/${systemId}`, express.static(`${systemPath}/public`));
    buildApp.use(`/systems/${systemId}`, express.static(`${systemPath}/public`));

    // Write templates list
    let templatesList: string[] = [];
    let templatesFolder = `${systemPath}/public/templates`;
    if (fs.existsSync(templatesFolder))
      templatesList = fs.readdirSync(templatesFolder);
    fs.writeFileSync(`${systemPath}/public/templates.json`, JSON.stringify(templatesList, null, 2));

    // Load plugins
    let pluginsInfo = loadPlugins(systemId, `${systemPath}/plugins`, mainApp, buildApp);

    let packagePath = `${systemPath}/package.json`;
    if (fs.existsSync(packagePath)) {
      let packageJSON = JSON.parse(fs.readFileSync(packagePath, { encoding: "utf8" }));
      if (packageJSON.superpowers != null && packageJSON.superpowers.publishedPluginBundles != null)
        pluginsInfo.publishedBundles = pluginsInfo.publishedBundles.concat(packageJSON.superpowers.publishedPluginBundles);
    }
    fs.writeFileSync(`${systemPath}/public/plugins.json`, JSON.stringify(pluginsInfo, null, 2));

    // Build files
    let buildFiles: string[] = buildFilesBySystem[systemId] = [ "/SupCore.js" ];

    for (let plugin of pluginsInfo.list) {
      for (let bundleName of pluginsInfo.publishedBundles) {
        buildFiles.push(`/systems/${systemId}/plugins/${plugin}/bundles/${bundleName}.js`);
      }
    }

    readdirRecursive(`${systemPath}/public`, (err, entries) => {
      for (let entry of entries) {
        let relativePath = path.relative(`${systemPath}/public`, entry);
        if (relativePath === "manifest.json") continue;
        if (relativePath.slice(0, "templates".length) === "templates") continue;
        if (relativePath.slice(0, "locales".length) === "templates") continue;

        buildFiles.push(`/systems/${systemId}/${relativePath}`);
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

function loadPlugins (systemId: string, pluginsPath: string, mainApp: express.Express, buildApp: express.Express): SupCore.PluginsInfo {
  let pluginNamesByAuthor: { [author: string]: string[] } = {};
  let pluginsInfo: SupCore.PluginsInfo = { list: [], paths: { editors: {}, tools: {} }, publishedBundles: [] };

  let pluginsFolder: string[];
  try { pluginsFolder = fs.readdirSync(pluginsPath); } catch (err) { /* Ignore */ }
  if (pluginsFolder == null) return pluginsInfo;

  for (let pluginAuthor of pluginsFolder) {
    let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;
    if (shouldIgnoreFolder(pluginAuthor)) continue;

    pluginNamesByAuthor[pluginAuthor] = [];
    for (let pluginName of fs.readdirSync(pluginAuthorPath)) {
      if (shouldIgnoreFolder(pluginName)) continue;

      let pluginPath = `${pluginsPath}/${pluginAuthor}/${pluginName}`;
      if (!fs.statSync(pluginPath).isDirectory()) continue;

      pluginNamesByAuthor[pluginAuthor].push(pluginName);

      let packageData = fs.readFileSync(`${pluginPath}/package.json`, { encoding: "utf8" });
      if (packageData != null) {
        let packageJSON = JSON.parse(packageData);
        if (packageJSON.superpowers != null && packageJSON.superpowers.publishedPluginBundles != null)
          pluginsInfo.publishedBundles = pluginsInfo.publishedBundles.concat(packageJSON.superpowers.publishedPluginBundles);
      }
    }
  }

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

          mainApp.get(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}/editors/${editorName}`, (req, res) => {
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
      mainApp.get(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}/locales/*.json`, (req, res) => {
        let localeFile = req.path.split("/locales/")[1];
        let localePath = path.join(pluginPath, "public/locales", localeFile);
        fs.exists(localePath, (exists) => {
          if (exists) res.sendFile(localePath);
          else res.send("{}");
        });
      });

      for (let app of [mainApp, buildApp]) {
        app.get(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}/bundles/*.js`, (req, res) => {
          let bundleFile = req.path.split("/bundles/")[1];
          let bundlePath = path.join(pluginPath, "public/bundles", bundleFile);
          fs.exists(bundlePath, (exists) => {
            if (exists) res.sendFile(bundlePath);
            else res.send("");
          });
        });
        app.use(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}`, express.static(`${pluginPath}/public`));
      }
    });
  });

  return pluginsInfo;
}
