import * as path from "path";
import * as fs from "fs";
import * as express from "express";
import * as async from "async";
import * as readdirRecursive from "recursive-readdir";
import getLocalizedFilename from "./getLocalizedFilename";

function shouldIgnoreFolder(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }
const systemsPath = path.resolve(`${__dirname}/../systems`);

export const buildFilesBySystem: { [systemId: string]: string[]; } = {};

export default function(mainApp: express.Express, buildApp: express.Express, callback: Function) {
  async.eachSeries(fs.readdirSync(systemsPath), (systemFolderName, cb) => {
    if (systemFolderName.indexOf(".") !== -1) { cb(); return; }

    const systemPath = path.join(systemsPath, systemFolderName);
    if (!fs.statSync(systemPath).isDirectory()) { cb(); return; }

    const systemId = JSON.parse(fs.readFileSync(path.join(systemsPath, systemFolderName, "package.json"), { encoding: "utf8" })).superpowers.systemId;
    SupCore.system = SupCore.systems[systemId] = new SupCore.System(systemId, systemFolderName);

    // Expose public stuff
    try { fs.mkdirSync(`${systemPath}/public`); } catch (err) { /* Ignore */ }
    mainApp.use(`/systems/${systemId}`, express.static(`${systemPath}/public`));
    buildApp.use(`/systems/${systemId}`, express.static(`${systemPath}/public`));

    // Write templates list
    let templatesList: string[] = [];
    const templatesFolder = `${systemPath}/public/templates`;
    if (fs.existsSync(templatesFolder)) templatesList = fs.readdirSync(templatesFolder);
    fs.writeFileSync(`${systemPath}/public/templates.json`, JSON.stringify(templatesList, null, 2));

    // Load plugins
    const pluginsInfo = loadPlugins(systemId, `${systemPath}/plugins`, mainApp, buildApp);

    const packagePath = `${systemPath}/package.json`;
    if (fs.existsSync(packagePath)) {
      const packageJSON = JSON.parse(fs.readFileSync(packagePath, { encoding: "utf8" }));
      if (packageJSON.superpowers != null && packageJSON.superpowers.publishedPluginBundles != null)
        pluginsInfo.publishedBundles = pluginsInfo.publishedBundles.concat(packageJSON.superpowers.publishedPluginBundles);
    }
    fs.writeFileSync(`${systemPath}/public/plugins.json`, JSON.stringify(pluginsInfo, null, 2));

    // Build files
    const buildFiles: string[] = buildFilesBySystem[systemId] = [ "/SupCore.js" ];

    for (const plugin of pluginsInfo.list) {
      for (const bundleName of pluginsInfo.publishedBundles) {
        buildFiles.push(`/systems/${systemId}/plugins/${plugin}/bundles/${bundleName}.js`);
      }
    }

    readdirRecursive(`${systemPath}/public`, (err, entries) => {
      for (const entry of entries) {
        const relativePath = path.relative(`${systemPath}/public`, entry);
        if (relativePath === "manifest.json") continue;
        if (relativePath.slice(0, "templates".length) === "templates") continue;
        if (relativePath.slice(0, "locales".length) === "templates") continue;

        buildFiles.push(`/systems/${systemId}/${relativePath}`);
      }

      cb();
    });
  }, () => {
    const systemsInfo: SupCore.SystemsInfo = { list: Object.keys(SupCore.systems) };
    fs.writeFileSync(`${__dirname}/../public/systems.json`, JSON.stringify(systemsInfo, null, 2));

    SupCore.system = null;
    callback();
  });
}

function loadPlugins (systemId: string, pluginsPath: string, mainApp: express.Express, buildApp: express.Express): SupCore.PluginsInfo {
  const pluginNamesByAuthor: { [author: string]: string[] } = {};
  const pluginsInfo: SupCore.PluginsInfo = { list: [], paths: { editors: {}, tools: {} }, publishedBundles: [] };

  let pluginsFolder: string[];
  try { pluginsFolder = fs.readdirSync(pluginsPath); } catch (err) { /* Ignore */ }
  if (pluginsFolder == null) return pluginsInfo;

  for (const pluginAuthor of pluginsFolder) {
    const pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;
    if (shouldIgnoreFolder(pluginAuthor)) continue;

    pluginNamesByAuthor[pluginAuthor] = [];
    for (const pluginName of fs.readdirSync(pluginAuthorPath)) {
      if (shouldIgnoreFolder(pluginName)) continue;

      const pluginPath = `${pluginsPath}/${pluginAuthor}/${pluginName}`;
      if (!fs.statSync(pluginPath).isDirectory()) continue;

      pluginNamesByAuthor[pluginAuthor].push(pluginName);

      const packageData = fs.readFileSync(`${pluginPath}/package.json`, { encoding: "utf8" });
      if (packageData != null) {
        const packageJSON = JSON.parse(packageData);
        if (packageJSON.superpowers != null && packageJSON.superpowers.publishedPluginBundles != null)
          pluginsInfo.publishedBundles = pluginsInfo.publishedBundles.concat(packageJSON.superpowers.publishedPluginBundles);
      }
    }
  }

  Object.keys(pluginNamesByAuthor).forEach((pluginAuthor) => {
    const pluginNames = pluginNamesByAuthor[pluginAuthor];
    const pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;

    pluginNames.forEach((pluginName) => {
      const pluginPath = `${pluginAuthorPath}/${pluginName}`;

      // Load data module
      const dataModulePath = `${pluginPath}/data/index.js`;
      if (fs.existsSync(dataModulePath)) {
        /* tslint:disable */
        require(dataModulePath);
        /* tslint:enable */
      }

      // Collect plugin info
      pluginsInfo.list.push(`${pluginAuthor}/${pluginName}`);
      if (fs.existsSync(`${pluginPath}/public/editors`)) {
        const editors = fs.readdirSync(`${pluginPath}/public/editors`);
        editors.forEach((editorName) => {
          if (SupCore.system.data.assetClasses[editorName] != null) {
            pluginsInfo.paths.editors[editorName] = `${pluginAuthor}/${pluginName}`;
          } else {
            pluginsInfo.paths.tools[editorName] = `${pluginAuthor}/${pluginName}`;
          }

          mainApp.get(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}/editors/${editorName}`, (req, res) => {
            const language = req.cookies["supLanguage"];
            const editorPath = path.join(pluginPath, "public/editors", editorName);
            const localizedIndexFilename = getLocalizedFilename("index.html", language);
            fs.exists(path.join(editorPath, localizedIndexFilename), (exists) => {
              if (exists) res.sendFile(path.join(editorPath, localizedIndexFilename));
              else res.sendFile(path.join(editorPath, `index.html`));
            });
          });
        });
      }

      // Expose public stuff
      mainApp.get(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}/locales/*.json`, (req, res) => {
        const localeFile = req.path.split("/locales/")[1];
        const localePath = path.join(pluginPath, "public/locales", localeFile);
        fs.exists(localePath, (exists) => {
          if (exists) res.sendFile(localePath);
          else res.send("{}");
        });
      });

      for (const app of [mainApp, buildApp]) {
        app.get(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}/bundles/*.js`, (req, res) => {
          const bundleFile = req.path.split("/bundles/")[1];
          const bundlePath = path.join(pluginPath, "public/bundles", bundleFile);
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
