declare module SupAPI {
  var contexts: any;
  function registerPlugin(contextName: string, pluginName: string,
    plugin: {code: string; defs: string; exposeActorComponent?: {propertyName: string; className: string};});
}
