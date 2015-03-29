module.exports = class ProjectClient

  constructor: (@socket, options) ->
    @socket.on 'edit:assets', @_onAssetEdited
    @socket.on 'trash:assets', @_onAssetTrashed
    @socket.on 'edit:resources', @_onResourceEdited

    @entries = null
    @entriesSubscribers = []

    @assetsById = {}
    @subscribersByAssetId = {}

    @resourcesById = {}
    @subscribersByResourceId = {}

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
    console.warn "ProjectClient.sub has been deprecated and will be removed soon. Please use ProjectClient.subAsset instead."
    @subAsset assetId, assetType, subscriber; return

  unsub: (assetId, assetType, subscriber) ->
    console.warn "ProjectClient.unsub has been deprecated and will be removed soon. Please use ProjectClient.unsubAsset instead."
    @unsubAsset assetId, assetType, subscriber; return

  subAsset: (assetId, assetType, subscriber) ->
    subscribers = @subscribersByAssetId[assetId]
    if ! subscribers?
      subscribers = @subscribersByAssetId[assetId] = []
      @socket.emit 'sub', 'assets', assetId, @_onAssetReceived.bind @, assetId, assetType
    else
      asset = @assetsById[assetId]
      if asset? then subscriber.onAssetReceived assetId, asset

    subscribers.push subscriber
    return

  unsubAsset: (assetId, subscriber) ->
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


  subResource: (resourceId, subscriber) ->
    subscribers = @subscribersByResourceId[resourceId]
    if ! subscribers?
      subscribers = @subscribersByResourceId[resourceId] = []
      @socket.emit 'sub', 'resources', resourceId, @_onResourceReceived.bind @, resourceId
    else
      resource = @resourcesById[resourceId]
      if resource? then subscriber.onResourceReceived resourceId, resource

    subscribers.push subscriber
    return

  unsubResource: (resourceId, subscriber) ->
    subscribers = @subscribersByResourceId[resourceId]
    return if ! subscribers?

    index = subscribers.indexOf(subscriber)
    return if index == -1

    subscribers.splice index, 1
    if subscribers.length == 0
      delete @subscribersByResourceId[resourceId]
      delete @resourcesById[resourceId]
      @socket.emit 'unsub', 'resources', resourceId

    return


  _onAssetReceived: (assetId, assetType, err, assetData) ->
    # FIXME: The asset was probably trashed in the meantime, handle that
    if err?
      console.warn "Got an error in ProjectClient._onAssetReceived: #{err}"
      return

    subscribers = @subscribersByAssetId[assetId]
    return if ! subscribers?

    asset = @assetsById[assetId] = new SupCore.data.assetClasses[assetType] assetId, assetData

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


  _onResourceReceived: (resourceId, err, resourceData) ->
    if err?
      console.warn "Got an error in ProjectClient._onResourceReceived: #{err}"
      return

    subscribers = @subscribersByResourceId[resourceId]
    return if ! subscribers?

    resource = @resourcesById[resourceId] = new SupCore.data.resourceClasses[resourceId] resourceData

    for subscriber in subscribers
      subscriber.onResourceReceived resourceId, resource

    return

  _onResourceEdited: (resourceId, command, args...) =>
    subscribers = @subscribersByResourceId[resourceId]
    return if ! subscribers?

    resource = @resourcesById[resourceId]
    resource.__proto__["client_#{command}"].apply resource, args

    for subscriber in subscribers
      subscriber.onResourceEdited resourceId, command, args...

    return


  _onEntriesReceived: (err, entries) =>
    @entries = new SupCore.data.Entries entries

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
