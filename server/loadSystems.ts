import * as path from "path";
import * as fs from "fs";
import * as express from "express";
import * as async from "async";
import * as mkdirp from "mkdirp";
import getLocalizedFilename from "./getLocalizedFilename";

function shouldIgnoreFolder(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }

export default function(mainApp: express.Express, buildApp: express.Express, callback: Function) {
  const rwDirs = fs.readdirSync(SupCore.rwSystemsPath).map((systemFolderName) => {
    return [SupCore.rwSystemsPath, systemFolderName];
  });
  const dirs = fs.readdirSync(SupCore.systemsPath).map((systemFolderName) => {
    return [SupCore.systemsPath, systemFolderName];
  });
  async.eachSeries(rwDirs.concat(dirs), (pathAndFolderName, cb) => {
    const systemFolderName = pathAndFolderName[1];
    if (systemFolderName.indexOf(".") !== -1) { cb(); return; }

    const systemsPath = pathAndFolderName[0];
    const systemPath = path.join(systemsPath, systemFolderName);
    const rwSystemPath = path.join(SupCore.rwSystemsPath, systemFolderName);
    if (!fs.statSync(systemPath).isDirectory()) { cb(); return; }
    const pkgJSONFile = path.join(systemPath, "package.json");
    if (!fs.existsSync(pkgJSONFile)) { cb(); return; }

    const systemId = JSON.parse(fs.readFileSync(pkgJSONFile, { encoding: "utf8" })).superpowers.systemId;
    if (systemId in SupCore.systems) {  cb(); return; }
    SupCore.system = SupCore.systems[systemId] = new SupCore.System(systemsPath, systemId, systemFolderName);

    // Expose public stuff
    try { fs.mkdirSync(`${rwSystemPath}/public`); } catch (err) { /* Ignore */ }
    mainApp.use(`/systems/${systemId}`, express.static(`${systemPath}/public`));
    buildApp.use(`/systems/${systemId}`, express.static(`${systemPath}/public`));

    // Write templates list
    let templatesList: string[] = [];
    const templatesFolder = `${systemPath}/public/templates`;
    if (fs.existsSync(templatesFolder)) templatesList = fs.readdirSync(templatesFolder);
    const systemPublicDir = `${rwSystemPath}/public`;
    mkdirp.sync(systemPublicDir);
    const templatesFile = `${systemPublicDir}/templates.json`;
    fs.writeFileSync(templatesFile, JSON.stringify(templatesList, null, 2));
    mainApp.use(`/systems/${systemId}/templates.json`, express.static(templatesFile));
    buildApp.use(`/systems/${systemId}/templates.json`, express.static(templatesFile));

    // Load server-side system module
    const systemServerModulePath = `${systemPath}/server`;
    if (fs.existsSync(systemServerModulePath)) {
      /* tslint:disable */
      require(systemServerModulePath);
      /* tslint:enable */
    }

    // Load plugins
    const pluginsInfo = SupCore.system.pluginsInfo = loadPlugins(systemId, `${systemPath}/plugins`, mainApp, buildApp);
    const pluginsFile = `${systemPublicDir}/plugins.json`;
    fs.writeFileSync(pluginsFile, JSON.stringify(pluginsInfo, null, 2));
    mainApp.use(`/systems/${systemId}/plugins.json`, express.static(pluginsFile));
    buildApp.use(`/systems/${systemId}/plugins.json`, express.static(pluginsFile));

    cb();
  }, () => {
    const systemsInfo: SupCore.SystemsInfo = { list: Object.keys(SupCore.systems) };
    const systemsFile = `${SupCore.rwSystemsPath}/systems.json`;
    fs.writeFileSync(systemsFile, JSON.stringify(systemsInfo, null, 2));
    mainApp.use("/systems.json", express.static(systemsFile));
    buildApp.use("/systems.json", express.static(systemsFile));

    SupCore.system = null;
    callback();
  });
}

function loadPlugins (systemId: string, pluginsPath: string, mainApp: express.Express, buildApp: express.Express): SupCore.PluginsInfo {
  const pluginNamesByAuthor: { [author: string]: string[] } = {};
  const pluginsInfo: SupCore.PluginsInfo = { list: [], paths: { editors: {}, tools: {} } };

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
          // Ignore folders with no index.html
          try {
            const stats = fs.lstatSync(`${pluginPath}/public/editors/${editorName}/index.html`);
            if (!stats.isFile()) return;
          }
          catch (err) {
            if (err.code === "ENOENT") return;
            throw err;
          }

          if (SupCore.system.data.assetClasses[editorName] != null) {
            pluginsInfo.paths.editors[editorName] = `${pluginAuthor}/${pluginName}`;
          } else {
            pluginsInfo.paths.tools[editorName] = `${pluginAuthor}/${pluginName}`;
          }

          mainApp.get(`/systems/${systemId}/plugins/${pluginAuthor}/${pluginName}/editors/${editorName}`, (req, res) => {
            const languageCode = req.cookies["supLanguage"];
            const editorPath = path.join(pluginPath, "public/editors", editorName);
            const localizedIndexFilename = getLocalizedFilename("index.html", languageCode);
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
