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

      @server.data[endpoint].release id, @

    @server.removeRemoteClient @socket.id
    return

  _onSubscribe: (endpoint, id, callback) =>
    data = @server.data[endpoint]
    if ! data? then callback? "No such endpoint"; return

    roomName =
      if id? then "sub:#{endpoint}:#{id}"
      else "sub:#{endpoint}"

    if @subscriptions.indexOf(roomName) != -1 then callback? "You're already subscribed to #{id}"; return

    if ! id?
      @socket.join roomName
      @subscriptions.push roomName
      callback null, data.pub
      return

    data.acquire id, @, (err, item) =>
      if err? then callback err; return

      @socket.join roomName
      @subscriptions.push roomName

      callback null, item.pub
      return

    return

  _onUnsubscribe: (endpoint, id) =>
    data = @server.data[endpoint]
    if ! data? then callback? "No such endpoint"; return

    roomName =
      if id? then "sub:#{endpoint}:#{id}"
      else "sub:#{endpoint}"

    index = @subscriptions.indexOf(roomName)
    return if index == -1

    data.release id, @ if id?

    @socket.leave roomName
    @subscriptions.splice index, 1
    return
