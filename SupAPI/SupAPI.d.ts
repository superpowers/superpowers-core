interface PluginContent {
  code: string;
  defs: string;
  exposeActorComponent?: {propertyName: string; className: string};
}

declare module SupAPI {
  var contexts: {[contextName: string]: {plugins: {[pluginName: string]: PluginContent}}};
  function registerPlugin(contextName: string, pluginName: string, plugin: PluginContent): void;
}
