SupData = require './'
path = require 'path'

roomRegex = /^[A-Za-z0-9_]{1,20}$/

module.exports = class Rooms extends SupData.base.Dictionary

  constructor: (@server) ->
    super()

  acquire: (id, callback) ->
    if ! roomRegex.test(id) then callback "Invalid room id: #{id}"; return

    super id, callback

  _load: (id) ->
    room = new SupData.Room null, @server.data
    room.load path.join(@server.projectPath, "rooms/#{id}")

    room
