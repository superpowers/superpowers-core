export var contexts = {};

export function registerPlugin(contextName: string, pluginName: string,
  plugin: {code: string, defs: string, exposeActorComponent?: {propertyName: string; className: string}}) {

  if (contexts[contextName] == null) contexts[contextName] = { plugins: {} };

  if (contexts[contextName].plugins[pluginName] != null) {
    console.error(`SupAPI.registerPlugin: Tried to register two or more plugins named "${pluginName}" in context "${contextName}"`);
    }

  if (plugin.exposeActorComponent != null ) {
    if (plugin.exposeActorComponent.propertyName == null) {
      console.error(`SupAPI.registerPlugin: Missing actor component property name in plugin "${pluginName}" in context "${contextName}"`);
    }
    if (plugin.exposeActorComponent.className == null) {
      console.error(`SupAPI.registerPlugin: Missing actor component class name in plugin "${pluginName}" in context "${contextName}"`);
      }
  }

  contexts[contextName].plugins[pluginName] = plugin;
}
