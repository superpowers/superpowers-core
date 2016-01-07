import * as fs from "fs";
import * as path from "path";

function shouldIgnoreFolder(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }

class SystemData {
  assetClasses: { [assetName: string]: SupCore.Data.AssetClass; } = {};
  resourceClasses: { [resourceId: string]: SupCore.Data.ResourceClass; } = {};

  constructor(public system: System) {}

  registerAssetClass(name: string, assetClass: SupCore.Data.AssetClass) {
    if (this.assetClasses[name] != null) {
      console.log(`SystemData.registerAssetClass: Tried to register two or more asset classes named "${name}" in system "${this.system.name}"`);
      return;
    }
    this.assetClasses[name] = assetClass;
    return;
  }

  registerResource(id: string, resourceClass: SupCore.Data.ResourceClass) {
    if (this.resourceClasses[id] != null) {
      console.log(`SystemData.registerResource: Tried to register two or more plugin resources named "${id}" in system "${this.system.name}"`);
      return;
    }
    this.resourceClasses[id] = resourceClass;
  }
}

export class System {
  data: SystemData;
  private plugins: { [contextName: string]: { [pluginName: string]: any; } } = {};

  constructor(public name: string) {
    this.data = new SystemData(this);
  }

  requireForAllPlugins(filePath: string) {
    let pluginsPath = path.resolve(`${__dirname}/../systems/${this.name}/plugins`);

    for (let pluginAuthor of fs.readdirSync(pluginsPath)) {
      let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;
      if (shouldIgnoreFolder(pluginAuthor)) continue;

      for (let pluginName of fs.readdirSync(pluginAuthorPath)) {
        if (shouldIgnoreFolder(pluginName)) continue;

        let completeFilePath = `${pluginAuthorPath}/${pluginName}/${filePath}`;
        if (fs.existsSync(completeFilePath)) require(completeFilePath);
      }
    }
  }

  registerPlugin<T>(contextName: string, pluginName: string, plugin: T) {
    if (this.plugins[contextName] == null) this.plugins[contextName] = { plugins: {} };

    if (this.plugins[contextName][pluginName] != null) {
      console.error("SystemAPI.registerPlugin: Tried to register two or more plugins " +
      `named "${pluginName}" in context "${contextName}", system "${this.name}"`);
    }

    this.plugins[contextName][pluginName] = plugin;
  }

  getPlugins<T>(contextName: string): { [pluginName: string]: T } {
    return this.plugins[contextName];
  }
}

export var systems: { [system: string]: System } = {};
