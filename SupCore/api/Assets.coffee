api = require './'

path = require 'path'

module.exports = class Assets extends api.base.Dictionary

  constructor: (@server) ->
    super()

  acquire: (id, callback) ->
    if ! @server.api.entries.byId[id]?.type? then callback "Invalid asset id: #{id}"; return

    super id, callback

  _load: (id) ->
    entry = @server.api.entries.byId[id]

    assetClass = api.assetPlugins[entry.type]
    asset = new assetClass null, @server.api
    asset.load path.join(@server.projectPath, "assets/#{id}")

    asset
