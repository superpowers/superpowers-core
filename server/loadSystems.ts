import * as path from "path";
import * as fs from "fs";
import * as express from "express";
import * as async from "async";
import * as readdirRecursive from "recursive-readdir";

function shouldIgnorePlugin(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }
let publicPluginFiles = [ "data", "components", "componentEditors", "settingsEditors", "api", "runtime" ];
let systemsPath = path.resolve(`${__dirname}/../systems`);

export let buildFilesBySystem: { [systemName: string]: string[]; } = {};

export default function(mainApp: express.Express, buildApp: express.Express, callback: Function) {
  async.eachSeries(fs.readdirSync(systemsPath), (systemName, cb) => {
    SupCore.system = SupCore.systems[systemName] = new SupCore.System(systemName);
    let systemPath = path.join(systemsPath, systemName);

    // Expose public stuff
    mainApp.use(`/systems/${systemName}`, express.static(`${systemPath}/public`));
    buildApp.use(`/systems/${systemName}`, express.static(`${systemPath}/public`));

    // Load plugins
    let pluginsPath = `${systemPath}/plugins`;
    let pluginNamesByAuthor: { [author: string]: string[] } = {};
    for (let pluginAuthor of fs.readdirSync(pluginsPath)) {
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
        let apiModulePath = `${pluginPath}/api`;
        if (fs.existsSync(apiModulePath)) require(apiModulePath);

        // Expose public stuff
        mainApp.use(`/systems/${systemName}/plugins/${pluginAuthor}/${pluginName}`, express.static(`${pluginPath}/public`));
        buildApp.use(`/systems/${systemName}/plugins/${pluginAuthor}/${pluginName}`, express.static(`${pluginPath}/public`));

        // Ensure all public files exist
        for (let requiredFile of publicPluginFiles) {
          let requiredFilePath = `${pluginPath}/public/${requiredFile}.js`;
          if (!fs.existsSync(requiredFilePath)) fs.closeSync(fs.openSync(requiredFilePath, "w"));
        }
      }
    }

    // Second pass, because data modules might depend on API modules
    let pluginsInfo: {
      list: string[],
      paths: {
        editors: { [assetType: string]: string; },
        tools: { [name: string]: string; }
      }
    } = { list: [], paths: { editors: {}, tools: {} } };

    for (let pluginAuthor in pluginNamesByAuthor) {
      let pluginNames = pluginNamesByAuthor[pluginAuthor];
      let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;

      for (let pluginName of pluginNames) {
        let pluginPath = `${pluginAuthorPath}/${pluginName}`;

        // Load data module
        let dataModulePath = `${pluginPath}/data`;
        if (fs.existsSync(dataModulePath)) require(dataModulePath);

        // Collect plugin info
        pluginsInfo.list.push(`${pluginAuthor}/${pluginName}`);
        if (fs.existsSync(`${pluginPath}/editors`)) {
          for (let editorName of fs.readdirSync(`${pluginPath}/editors`)) {
            if (SupCore.system.data.assetClasses[editorName] != null) {
              pluginsInfo.paths.editors[editorName] = `${pluginAuthor}/${pluginName}`;
            } else {
              pluginsInfo.paths.tools[editorName] = `${pluginAuthor}/${pluginName}`;
            }
          }
        }
      }
    }

    fs.writeFileSync(`${systemPath}/public/plugins.json`, JSON.stringify(pluginsInfo, null, 2));

    // Build files
    let buildFiles: string[] = buildFilesBySystem[systemName] = [ "/SupCore.js" ];

    async.eachSeries(pluginsInfo.list, (plugin, cb) => {
      let pluginPublicPath = `${systemPath}/plugins/${plugin}/public`;
      readdirRecursive(pluginPublicPath, (err, entries) => {
        for (let entry of entries) {
          let relativePath = path.relative(pluginPublicPath, entry);
          buildFiles.push(`/systems/${systemName}/plugins/${plugin}/${relativePath}`);
        }
        cb();
      });
    }, () => {
      readdirRecursive(`${systemPath}/public`, (err, entries) => {
        for (let entry of entries) {
          let relativePath = path.relative(`${systemPath}/public`, entry);
          buildFiles.push(`/systems/${systemName}/${relativePath}`);
        }

        cb();
      });
    });
  }, () => {
    let systemsInfo: SupCore.SystemsInfo = { list: Object.keys(SupCore.systems) };
    fs.writeFileSync(`${__dirname}/../public/systems.json`, JSON.stringify(systemsInfo, null, 2));

    SupCore.system = null;
    callback();
  });
}
