exports.contexts = {}

exports.addPlugin = (contextName, pluginName, plugin) ->
  context = exports.contexts[contextName] ?= plugins: {}

  if context.plugins[pluginName]?
    console.error "SupAPI.addPlugin: Tried to load two or more plugins named \"#{pluginName}\" in context \"#{contextName}\""
    return

  if plugin.exposeActorComponent? and plugin.exposeActorComponent.indexOf(":") == -1
    console.error "SupAPI.addPlugin: Missing actor component type in plugin named \"#{pluginName}\" in context \"#{contextName}\""
    return

  context.plugins[pluginName] = plugin
  return
