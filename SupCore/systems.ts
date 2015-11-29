class SystemAPI {
  contexts: { [contextName: string]: { plugins: { [pluginName: string]: SupCore.APIPlugin; } } } = {};

  constructor(public system: System) {}

  registerPlugin(contextName: string, pluginName: string, plugin: SupCore.APIPlugin) {
    if (this.contexts[contextName] == null) this.contexts[contextName] = { plugins: {} };

    if (this.contexts[contextName].plugins[pluginName] != null) {
      console.error("SystemAPI.registerPlugin: Tried to register two or more plugins " +
      `named "${pluginName}" in context "${contextName}", system "${this.system.name}"`);
    }

    if (plugin.exposeActorComponent != null ) {
      if (plugin.exposeActorComponent.propertyName == null) {
        console.error("SystemAPI.registerPlugin: Missing actor component property name " +
        `in plugin "${pluginName}" in context "${contextName}", system "${this.system.name}"`);
      }
      if (plugin.exposeActorComponent.className == null) {
        console.error("SystemAPI.registerPlugin: Missing actor component class name " +
        `in plugin "${pluginName}" in context "${contextName}", system "${this.system.name}"`);
      }
    }

    this.contexts[contextName].plugins[pluginName] = plugin;
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
