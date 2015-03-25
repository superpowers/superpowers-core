Hash = require './Hash'

path = require 'path'
fs = require 'fs'

module.exports = class Resource extends Hash

  constructor: (pub, schema, @serverData) ->
    super pub, schema
    @setup() if pub?

  # OVERRIDE: Make sure to call super(callback). Called when creating a new resource
  init: (callback) -> @setup(); callback(); return

  # OVERRIDE: Called when creating/loading a resource
  setup: ->

  load: (assetPath) ->
    fs.readFile path.join(assetPath, "resource.json"), { encoding: 'utf8' }, (err, json) =>
      if err?
        if err.code == 'ENOENT'
          @init => @emit 'load'
          return

        throw err

      @pub = JSON.parse(json)
      @setup()
      @emit 'load'
      return
    return

  unload: -> @removeAllListeners(); return

  save: (assetPath, callback) ->
    json = JSON.stringify @pub, null, 2

    fs.mkdir path.join(assetPath), (err) ->
      if err? and err.code != 'EEXIST' then callback err; return
      fs.writeFile path.join(assetPath, "resource.json"), json, { encoding: 'utf8' }, callback
    return

  server_setProperty: (client, path, value, callback) ->
    @setProperty path, value, (err, actualValue) =>
      if err? then callback? err; return

      callback null, path, actualValue
      return
