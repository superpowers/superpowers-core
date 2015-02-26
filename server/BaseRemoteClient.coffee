module.exports = class BaseRemoteClient

  constructor: (@server, @socket) ->
    @socket.on 'disconnect', @_onDisconnect

    @socket.on 'sub', @_onSubscribe
    @socket.on 'unsub', @_onUnsubscribe

    @subscriptions = []

  errorIfCant: (action, callback) =>
    if ! @can action
      callback? "Forbidden"
      return false

    true

  _error: (message) ->
    @socket.emit 'error', message
    @socket.disconnect()
    return

  _onDisconnect: =>
    for subscription in @subscriptions
      [ sub, endpoint, id ] = subscription.split ':'
      continue if ! id?

      @server.data[endpoint].release id

    @server.removeRemoteClient @socket.id
    return

  _onSubscribe: (endpoint, id, callback) =>
    data = @server.data[endpoint]
    if ! data? then callback? "No such endpoint"; return
    if @subscriptions.indexOf(roomName) != -1 then callback? "You're already subscribed to #{id}"; return

    roomName =
      if id? then "sub:#{endpoint}:#{id}"
      else "sub:#{endpoint}"

    @socket.join roomName
    @subscriptions.push roomName

    if ! id?
      callback null, data.pub
      return

    data.acquire id, (err, item) =>
      if err?
        roomNameIndex = @subscriptions.indexOf(roomName)
        if roomNameIndex != -1
          @socket.leave roomName
          @subscriptions.splice roomNameIndex, 1

        callback err; return

      callback null, item.pub; return

    return

  _onUnsubscribe: (endpoint, id) =>
    data = @server.data[endpoint]
    if ! data? then callback? "No such endpoint"; return

    index = @subscriptions.indexOf(roomName)
    return if index == -1

    if id?
      roomName = "sub:#{endpoint}:#{id}"
      data.release id
    else
      roomName = "sub:#{endpoint}"

    @socket.leave roomName
    @subscriptions.splice index, 1
    return
