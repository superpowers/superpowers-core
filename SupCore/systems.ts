import * as fs from "fs";
import * as path from "path";

export let systemsPath: string;
export let systems: { [system: string]: System } = {};

function shouldIgnoreFolder(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }

export class System {
  data: SystemData;
  private plugins: { [contextName: string]: { [pluginName: string]: any; } } = {};

  pluginsInfo: SupCore.PluginsInfo;
  serverBuild: (server: ProjectServer, buildPath: string, callback: (err: string) => void) => void;

  constructor(public id: string, public folderName: string) {
    this.data = new SystemData(this);
  }

  requireForAllPlugins(filePath: string) {
    const pluginsPath = path.resolve(`${SupCore.systemsPath}/${this.folderName}/plugins`);

    for (const pluginAuthor of fs.readdirSync(pluginsPath)) {
      const pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;
      if (shouldIgnoreFolder(pluginAuthor)) continue;

      for (const pluginName of fs.readdirSync(pluginAuthorPath)) {
        if (shouldIgnoreFolder(pluginName)) continue;

        const completeFilePath = `${pluginAuthorPath}/${pluginName}/${filePath}`;
        if (fs.existsSync(completeFilePath)) {
          /* tslint:disable */
          require(completeFilePath);
          /* tslint:enable */
        }
      }
    }
  }

  registerPlugin<T>(contextName: string, pluginName: string, plugin: T) {
    if (this.plugins[contextName] == null) this.plugins[contextName] = {};

    if (this.plugins[contextName][pluginName] != null) {
      console.error("SupCore.system.registerPlugin: Tried to register two or more plugins " +
      `named "${pluginName}" in context "${contextName}", system "${this.id}"`);
    }

    this.plugins[contextName][pluginName] = plugin;
  }

  getPlugins<T>(contextName: string): { [pluginName: string]: T } {
    return this.plugins[contextName];
  }
}

class SystemData {
  assetClasses: { [assetName: string]: SupCore.Data.AssetClass; } = {};
  resourceClasses: { [resourceId: string]: SupCore.Data.ResourceClass; } = {};

  constructor(public system: System) {}

  registerAssetClass(name: string, assetClass: SupCore.Data.AssetClass) {
    if (this.assetClasses[name] != null) {
      console.log(`SystemData.registerAssetClass: Tried to register two or more asset classes named "${name}" in system "${this.system.id}"`);
      return;
    }
    this.assetClasses[name] = assetClass;
    return;
  }

  registerResource(id: string, resourceClass: SupCore.Data.ResourceClass) {
    if (this.resourceClasses[id] != null) {
      console.log(`SystemData.registerResource: Tried to register two or more plugin resources named "${id}" in system "${this.system.id}"`);
      return;
    }
    this.resourceClasses[id] = resourceClass;
  }
}
