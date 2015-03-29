SupData = require './'
path = require 'path'

module.exports = class Assets extends SupData.base.Dictionary

  constructor: (@server) ->
    super()

  acquire: (id, owner, callback) ->
    if ! @server.data.entries.byId[id]?.type? then callback "Invalid asset id: #{id}"; return

    super id, owner, callback

  _load: (id) ->
    entry = @server.data.entries.byId[id]

    assetClass = SupData.assetClasses[entry.type]
    if ! assetClass? then throw new Error "No data plugin for asset type \"#{entry.type}\""

    asset = new assetClass id, null, @server.data
    asset.load path.join(@server.projectPath, "assets/#{id}")

    asset
