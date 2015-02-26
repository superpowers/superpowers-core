SupData = require './'
path = require 'path'

module.exports = class Assets extends SupData.base.Dictionary

  constructor: (@server) ->
    super()

  acquire: (id, callback) ->
    if ! @server.data.entries.byId[id]?.type? then callback "Invalid asset id: #{id}"; return

    super id, callback

  _load: (id) ->
    entry = @server.data.entries.byId[id]

    assetClass = SupData.assetPlugins[entry.type]
    asset = new assetClass null, @server.data
    asset.load path.join(@server.projectPath, "assets/#{id}")

    asset
