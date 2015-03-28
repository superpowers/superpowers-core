Hash = require './Hash'

path = require 'path'
fs = require 'fs'

module.exports = class Asset extends Hash

  constructor: (pub, schema, @serverData) ->
    super pub, schema
    @setup() if pub?

  # OVERRIDE: Make sure to call super(callback). Called when creating a new asset
  init: (options, callback) -> @setup(); callback(); return

  # OVERRIDE: Called when creating/loading an asset
  setup: ->

  # OVERRIDE: Called when loading a project
  # Check for any error/warning/info and @emit 'setDiagnostic' as required
  # Also if the asset depends on others, @emit 'addDependencies' with a list of entry IDs
  restore: ->

  load: (assetPath) ->
    fs.readFile path.join(assetPath, "asset.json"), { encoding: 'utf8' }, (err, json) =>
      if err? then throw err

      @pub = JSON.parse(json)
      @setup()
      @emit 'load'
      return
    return

  unload: -> @removeAllListeners(); return

  save: (assetPath, callback) ->
    json = JSON.stringify @pub, null, 2
    fs.writeFile path.join(assetPath, "asset.json"), json, { encoding: 'utf8' }, callback
    return

  server_setProperty: (client, path, value, callback) ->
    @setProperty path, value, (err, actualValue) =>
      if err? then callback? err; return

      callback null, path, actualValue
      return
