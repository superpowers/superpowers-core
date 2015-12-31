class SystemAPI {
  private contexts: { [contextName: string]: { plugins: { [pluginName: string]: any; } } } = {};

  constructor(public system: System) {}

  registerPlugin<T>(contextName: string, pluginName: string, plugin: T) {
    if (this.contexts[contextName] == null) this.contexts[contextName] = { plugins: {} };

    if (this.contexts[contextName].plugins[pluginName] != null) {
      console.error("SystemAPI.registerPlugin: Tried to register two or more plugins " +
      `named "${pluginName}" in context "${contextName}", system "${this.system.name}"`);
    }

    this.contexts[contextName].plugins[pluginName] = plugin;
  }

  getPlugins<T>(contextName: string): { [pluginName: string]: T } {
    return this.contexts[contextName].plugins;
  }
}

class SystemData {
  assetClasses: { [assetName: string]: SupCore.Data.AssetClass; } = {};
  componentConfigClasses: { [componentConfigName: string]: SupCore.Data.ComponentConfigClass; } = {};
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

  registerComponentConfigClass(name: string, configClass: SupCore.Data.ComponentConfigClass) {
    if (this.componentConfigClasses[name] != null) {
      console.log(`SystemData.registerComponentConfigClass: Tried to register two or more component configuration classes named "${name}" in system "${this.system.name}"`);
      return;
    }
    this.componentConfigClasses[name] = configClass;
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
  api: SystemAPI;
  data: SystemData;

  constructor(public name: string) {
    this.api = new SystemAPI(this);
    this.data = new SystemData(this);
  }
}

export var systems: { [system: string]: System } = {};
