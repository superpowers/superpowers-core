module.exports = class ProjectClient

  constructor: (@socket, options) ->
    @socket.on 'edit:assets', @_onAssetEdited
    @socket.on 'trash:assets', @_onAssetTrashed

    @entries = null
    @assetsById = {}
    @subscribersByAssetId = {}

    @entriesSubscribers = []

    # Allow keeping an entries subscription alive at all times
    # Used in the scene editor to avoid constantly unsub'ing & resub'ing
    @_keepEntriesSubscription = options?.subEntries
    if @_keepEntriesSubscription
      @socket.emit 'sub', 'entries', null, @_onEntriesReceived


  subEntries: (subscriber) ->
    @entriesSubscribers.push subscriber

    if @entriesSubscribers.length == 1 and ! @_keepEntriesSubscription
      @socket.emit 'sub', 'entries', null, @_onEntriesReceived
    else if @entries?
      subscriber.onEntriesReceived @entries
    return

  unsubEntries: (subscriber) ->
    @entriesSubscribers.splice @entriesSubscribers.indexOf(subscriber), 1

    if @entriesSubscribers.length == 0 and ! @_keepEntriesSubscription
      @socket.emit 'unsub', 'entries'

      @socket.removeListener 'add:entries', @_onEntryAdded
      @socket.removeListener 'move:entries', @_onEntryMoved
      @socket.removeListener 'setProperty:entries', @_onSetEntryProperty
      @socket.removeListener 'trash:entries', @_onEntryTrashed

      @entries = null
    return

  sub: (assetId, assetType, subscriber) ->
    subscribers = @subscribersByAssetId[assetId]
    if ! subscribers?
      subscribers = @subscribersByAssetId[assetId] = []
      @socket.emit 'sub', 'assets', assetId, @_onAssetReceived.bind @, assetId, assetType
    else
      asset = @assetsById[assetId]
      if asset? then subscriber.onAssetReceived assetId, asset

    subscribers.push subscriber
    return

  unsub: (assetId, subscriber) ->
    subscribers = @subscribersByAssetId[assetId]
    return if ! subscribers?

    index = subscribers.indexOf(subscriber)
    return if index == -1

    subscribers.splice index, 1
    if subscribers.length == 0
      delete @subscribersByAssetId[assetId]
      delete @assetsById[assetId]
      @socket.emit 'unsub', 'assets', assetId

    return

  _onAssetReceived: (assetId, assetType, err, assetData) ->
    # FIXME: The asset was probably trashed in the meantime, handle that
    if err?
      console.warn "Got an error in AssetSubscriptionManager._onAssetReceived: #{err}"
      return

    subscribers = @subscribersByAssetId[assetId]
    return if ! subscribers?

    asset = @assetsById[assetId] = new SupCore.api.assetPlugins[assetType] assetData

    for subscriber in subscribers
      subscriber.onAssetReceived assetId, asset

    return

  _onAssetEdited: (assetId, command, args...) =>
    subscribers = @subscribersByAssetId[assetId]
    return if ! subscribers?

    asset = @assetsById[assetId]
    asset.__proto__["client_#{command}"].apply asset, args

    for subscriber in subscribers
      subscriber.onAssetEdited assetId, command, args...

    return

  _onAssetTrashed: (assetId) =>
    subscribers = @subscribersByAssetId[assetId]
    return if ! subscribers?

    for subscriber in subscribers
      subscriber.onAssetTrashed assetId

    delete @assetsById[assetId]
    delete @subscribersByAssetId[assetId]

    return


  _onEntriesReceived: (err, entries) =>
    @entries = new SupCore.api.Entries entries

    @socket.on 'add:entries', @_onEntryAdded
    @socket.on 'move:entries', @_onEntryMoved
    @socket.on 'setProperty:entries', @_onSetEntryProperty
    @socket.on 'trash:entries', @_onEntryTrashed

    for subscriber in @entriesSubscribers
      subscriber.onEntriesReceived @entries
    return

  _onEntryAdded: (entry, parentId, index) =>
    @entries.client_add entry, parentId, index
    for subscriber in @entriesSubscribers
      subscriber.onEntryAdded entry, parentId, index
    return

  _onEntryMoved: (id, parentId, index) =>
    @entries.client_move id, parentId, index

    for subscriber in @entriesSubscribers
      subscriber.onEntryMoved id, parentId, index
    return

  _onSetEntryProperty: (id, key, value) =>
    @entries.client_setProperty id, key, value

    for subscriber in @entriesSubscribers
      subscriber.onSetEntryProperty id, key, value
    return

  _onEntryTrashed: (id) =>
    @entries.client_remove id

    for subscriber in @entriesSubscribers
      subscriber.onEntryTrashed id
    return
