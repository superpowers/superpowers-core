Hash = require './Hash'

module.exports = class ComponentConfig extends Hash

  constructor: (pub, schema) ->
    super pub, schema

  # OVERRIDE: Called when loading a scene
  # Check for any error/warning/info and @emit 'setDiagnostic' as required
  # Also if the component depends on assets, @emit 'addDependencies' with a list of entry IDs
  restore: ->

  # OVERRIDE: Called when destroying a component or its actor
  # If the component depends on assets, @emit 'removeDependencies' with a list of entry IDs
  destroy: ->

  # OVERRIDE: Called when editing a property
  # You can check for asset dependency changes by overriding this method
  # and calling @emit 'addDependencies' / 'removeDependencies' as needed
  # setProperty: (path, value, callback) ->

  server_setProperty: (client, path, value, callback) ->
    @setProperty path, value, (err, actualValue) =>
      if err? then callback? err; return

      callback? null, path, actualValue
      return
