SupData = require './'
path = require 'path'

roomRegex = /^[A-Za-z0-9_]{1,20}$/

module.exports = class Rooms extends SupData.base.Dictionary

  constructor: (@server) ->
    super()

  acquire: (id, owner, callback) ->
    if ! roomRegex.test(id) then callback "Invalid room id: #{id}"; return

    super id, owner, (err, item) =>
      if err? then callback err; return
      if ! owner? then callback null, item; return

      item.join owner, (err, roomUser) =>
        @server.io.in("sub:rooms:#{id}").emit 'edit:rooms', id, 'join', roomUser

        callback null, item
        return
      return
    return

  release: (id, owner, options) ->
    super id, owner, options
    if ! owner? then return

    @byId[id].leave owner, (err, roomUserId) =>
      @server.io.in("sub:rooms:#{id}").emit 'edit:rooms', id, 'leave', roomUserId
      return
    return

  _load: (id) ->
    room = new SupData.Room null, @server.data
    room.load path.join(@server.projectPath, "rooms/#{id}")

    room
