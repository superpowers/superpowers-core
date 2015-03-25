exports.contexts = {}

exports.registerPlugin = (contextName, pluginName, plugin) ->
  context = exports.contexts[contextName] ?= plugins: {}

  if context.plugins[pluginName]?
    console.error "SupAPI.registerPlugin: Tried to register two or more plugins named \"#{pluginName}\" in context \"#{contextName}\""
    return

  if plugin.exposeActorComponent?
    if ! plugin.exposeActorComponent.propertyName?
      console.error "SupAPI.registerPlugin: Missing actor component property name in plugin \"#{pluginName}\" in context \"#{contextName}\""
      return
    if ! plugin.exposeActorComponent.className?
      console.error "SupAPI.registerPlugin: Missing actor component class name in plugin \"#{pluginName}\" in context \"#{contextName}\""
      return

  context.plugins[pluginName] = plugin
  return
