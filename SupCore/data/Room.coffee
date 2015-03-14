SupData = require './'

path = require 'path'
fs = require 'fs'

module.exports = class Room extends SupData.base.Hash

  constructor: (pub) ->
    super pub, {
      history:
        type: 'array'
        items:
          type: 'hash'
          properties:
            timestamp: { type: 'number' }
            author: { type: 'string' }
            text: { type: 'string' }
      users: { type: 'listById' }
    }

    if @pub? then @users = new SupData.RoomUsers @pub.users

  destroy: -> @removeAllListeners(); return

  load: (roomPath) ->
    fs.readFile path.join("#{roomPath}.json"), { encoding: 'utf8' }, (err, json) =>
      if err? and err.code != 'ENOENT' then throw err

      if ! json? then @pub = { history: [] }
      else @pub = JSON.parse(json)

      @pub.users = []
      @users = new SupData.RoomUsers @pub.users

      @emit 'load'
      return
    return

  save: (roomPath, callback) ->
    users = @pub.users
    delete @pub.users
    json = JSON.stringify @pub, null, 2
    @pub.users = users

    fs.writeFile path.join("#{roomPath}.json"), json, { encoding: 'utf8' }, callback
    return

  join: (client, callback) ->
    item = @users.byId[client.socket.username]
    if item?
      item.connectionCount++
      callback null, item
      return

    item = { id: client.socket.username, connectionCount: 1 }

    @users.add item, null, (err, actualIndex) =>
      if err? then throw new Error(err)
      callback null, item, actualIndex
      return
    return

  leave: (client, callback) ->
    item = @users.byId[client.socket.username]
    if item.connectionCount > 1
      item.connectionCount--
      callback null, client.socket.username
      return

    @users.remove client.socket.username, (err) =>
      if err? then throw new Error(err)
      callback null, client.socket.username
      return
    return

  client_join: (item, index) ->
    if index? then @users.client_add item, index
    else @users.byId[item.id].connectionCount++
    return

  client_leave: (id) ->
    item = @users.byId[id]
    if item.connectionCount > 1
      item.connectionCount--
      return

    @users.client_remove id
    return

  server_appendMessage: (client, text, callback) ->
    if typeof(text) != 'string' or text.length > 300 then callback? 'Your message was too long'; return

    entry = { timestamp: Date.now(), author: client.socket.username, text: text }
    @pub.history.push entry
    if @pub.history.length > 100 then @pub.history.splice(0, 1)

    callback? null, entry
    @emit 'change'
    return

  client_appendMessage: (entry) ->
    @pub.history.push entry
    if @pub.history.length > 100 then @pub.history.splice(0, 1)
    return
