base = require './base'

path = require 'path'
fs = require 'fs'

module.exports = class Room extends base.Hash

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
    }

    ###
    users:
      type: 'array'
      items:
        type: 'hash'
        properties:
          userId: { type: 'number' }
          username: { type: 'string' }
    ###

  load: (roomPath) ->
    fs.readFile path.join("#{roomPath}.json"), { encoding: 'utf8' }, (err, json) =>
      if err? and err.code != 'ENOENT' then throw err

      if ! json? then @pub = { history: [] }
      else @pub = JSON.parse(json)
      @emit 'load'
      return
    return

  save: (roomPath, callback) ->
    console.log "saving to #{roomPath}"
    json = JSON.stringify @pub, null, 2
    fs.writeFile path.join("#{roomPath}.json"), json, { encoding: 'utf8' }, callback
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
