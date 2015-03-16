fs = require 'fs'
path = require 'path'
async = require 'async'

authMiddleware = require './authenticate'
RemoteProjectClient = require './RemoteProjectClient'
schemas = require './schemas'

module.exports = class ProjectServer

  constructor: (globalIO, @projectPath, manifestData, callback) ->

    @data =
      assets: new SupCore.data.Assets @
      rooms: new SupCore.data.Rooms @

    @scheduledSaveCallbacks = {}
    @nextClientId = 0
    @clientsBySocketId = {}

    @data.assets.on 'itemLoad', @_onAssetLoaded
    @data.rooms.on 'itemLoad', @_onRoomLoaded

    migrate = (callback) =>
      # Old projects didn't have a rooms folder
      fs.mkdir path.join(@projectPath, 'rooms'), (err) =>
        callback(); return
      return

    loadManifest = (callback) =>
      if manifestData?
        @data.manifest = new SupCore.data.Manifest manifestData
        @data.manifest.on 'change', @_onManifestChanged
        callback(); return

      fs.readFile path.join(@projectPath, 'manifest.json'), { encoding: 'utf8' }, (err, manifestJSON) =>
        if err? then callback err; return

        try manifestData = JSON.parse manifestJSON
        catch err then callback err; return

        try schemas.validate manifestData, 'projectManifest'
        catch err then callback err; return

        @data.manifest = new SupCore.data.Manifest manifestData
        @data.manifest.on 'change', @_onManifestChanged

        callback(); return

    loadInternals = (callback) =>
      fs.readFile path.join(@projectPath, 'internals.json'), { encoding: 'utf8' }, (err, internalsJSON) =>
        if err? then callback err; return

        try internalsData = JSON.parse internalsJSON
        catch err then callback err; return

        @data.internals = new SupCore.data.Internals internalsData
        @data.internals.on 'change', @_onInternalsChanged

        callback(); return

    loadMembers = (callback) =>
      fs.readFile path.join(@projectPath, 'members.json'), { encoding: 'utf8' }, (err, membersJSON) =>
        if err? then callback err; return

        try membersData = JSON.parse membersJSON
        catch err then callback err; return

        try schemas.validate membersData, 'projectMembers'
        catch err then callback err; return

        @data.members = new SupCore.data.Members membersData
        @data.members.on 'change', @_onMembersChanged

        callback(); return

    loadEntries = (callback) =>
      fs.readFile path.join(@projectPath, 'entries.json'), { encoding: 'utf8' }, (err, entriesJSON) =>
        if err? then callback err; return

        try entriesData = JSON.parse entriesJSON
        catch err then callback err; return

        try schemas.validate entriesData, 'projectEntries'
        catch err then callback err; return

        @data.entries = new SupCore.data.Entries entriesData, @data.internals.pub.nextEntryId
        @data.entries.on 'change', @_onEntriesChanged

        callback(); return

    serve = (callback) =>
      # Setup the project's namespace
      @io = globalIO.of "/project:#{@data.manifest.pub.id}"
      @io.use authMiddleware
      @io.on 'connection', @_addSocket
      callback(); return

    # prepareAssets() must happen after serve()
    # since diagnostics rely on @io being setup
    prepareAssets = (callback) =>
      async.each Object.keys(@data.entries.byId), (assetId, cb) =>
        # Ignore folders
        if ! @data.entries.byId[assetId].type? then cb(); return

        @data.assets.acquire assetId, null, (err, asset) =>
          asset.restore()
          @data.assets.release assetId, null, skipUnloadDelay: true
          cb(); return
        return
      , callback
      return

    async.series [ migrate, loadManifest, loadMembers,
      loadInternals, loadEntries, serve, prepareAssets ], callback

  log: (message) ->
    SupCore.log "[#{@data.manifest.pub.id} #{@data.manifest.pub.name}] #{message}"
    return

  save: (callback) ->
    saveCallbacks = []

    for callbackName, callbackInfo of @scheduledSaveCallbacks
      continue if ! callbackInfo.timeoutId?

      clearTimeout callbackInfo.timeoutId
      saveCallbacks.push callbackInfo.callback

    @scheduledSaveCallbacks = {}

    async.parallel saveCallbacks, callback
    return

  removeRemoteClient: (socketId) =>
    delete @clientsBySocketId[socketId]

  _onAssetLoaded: (assetId, item) =>
    assetPath = path.join(@projectPath, "assets/#{assetId}")
    saveCallback = item.save.bind(item, assetPath)
    item.on 'change', => @_scheduleSave 60, "assets:#{assetId}", saveCallback; return

    item.on 'setDiagnostic', (diagnosticId, type, data) => @_setDiagnostic assetId, diagnosticId, type, data; return
    item.on 'clearDiagnostic', (diagnosticId) => @_clearDiagnostic assetId, diagnosticId; return

    item.on 'addDependencies', (dependencyEntryIds) => @_addDependencies assetId, dependencyEntryIds; return
    item.on 'removeDependencies', (dependencyEntryIds) => @_removeDependencies assetId, dependencyEntryIds; return
    return

  _onRoomLoaded: (roomId, item) =>
    roomPath = path.join(@projectPath, "rooms/#{roomId}")
    saveCallback = item.save.bind(item, roomPath)
    item.on 'change', => @_scheduleSave 60, "rooms:#{roomId}", saveCallback; return
    return

  _addSocket: (socket) =>
    client = new RemoteProjectClient @, @nextClientId++, socket
    @clientsBySocketId[socket.id] = client

  _scheduleSave: (minimumSecondsElapsed, callbackName, callback) =>
    #@log "Scheduling a save: #{callbackName}"

    scheduledCallback = @scheduledSaveCallbacks[callbackName]
    return if scheduledCallback?.timeoutId?

    errorCallback = (err) =>
      #@log "Save done! #{callbackName}"
      @log "Error in #{callbackName}:\n#{err}" if err?
      return

    if ! scheduledCallback? or scheduledCallback.lastTime <= Date.now() - minimumSecondsElapsed * 1000
      @scheduledSaveCallbacks[callbackName] = { lastTime: Date.now(), timeoutId: null }
      callback errorCallback
    else
      delay = minimumSecondsElapsed * 1000 - (Date.now() - scheduledCallback.lastTime)

      timeoutId = setTimeout =>
        callback errorCallback

        scheduledCallback.lastTime = Date.now()
        scheduledCallback.timeoutId = null
        scheduledCallback.callback = null
        return
      , delay

      scheduledCallback.timeoutId = timeoutId
      scheduledCallback.callback = callback

    return

  _onManifestChanged: => @_scheduleSave 60, 'manifest', @_saveManifest; return
  _onInternalsChanged: => @_scheduleSave 60, 'internals', @_saveInternals; return
  _onMembersChanged:  => @_scheduleSave 60, 'members', @_saveMembers; return
  _onEntriesChanged:  => @_scheduleSave 60, 'entries', @_saveEntries; return

  _saveManifest: (callback) =>
    manifestJSON = JSON.stringify @data.manifest.pub, null, 2
    fs.writeFile path.join(@projectPath, 'manifest.json'), manifestJSON, callback
    return

  _saveInternals: (callback) =>
    internalsJSON = JSON.stringify @data.internals.pub, null, 2
    fs.writeFile path.join(@projectPath, 'internals.json'), internalsJSON, callback
    return

  _saveMembers: (callback) =>
    membersJSON = JSON.stringify @data.members.pub, null, 2
    fs.writeFile path.join(@projectPath, 'members.json'), membersJSON, callback
    return

  _saveEntries: (callback) =>
    entriesJSON = JSON.stringify @data.entries.getForStorage(), null, 2
    fs.writeFile path.join(@projectPath, 'entries.json'), entriesJSON, callback 
    return

  _setDiagnostic: (assetId, diagnosticId, type, data) =>
    #console.log "_setDiagnostic #{assetId} #{diagnosticId} #{type}"
    diagnostics = @data.entries.diagnosticsByEntryId[assetId]

    newDiag = { id: diagnosticId, type, data }

    existingDiag = diagnostics.byId[diagnosticId]
    if existingDiag?
      existingDiag.type = type
      existingDiag.data = data
      @io.in('sub:entries').emit 'set:diagnostics', assetId, newDiag
      return

    diagnostics.add newDiag, null, (err) =>
      @io.in('sub:entries').emit 'set:diagnostics', assetId, newDiag
      return
    return

  _clearDiagnostic: (assetId, diagnosticId) =>
    #console.log "_clearDiagnostic #{assetId} #{diagnosticId}"
    diagnostics = @data.entries.diagnosticsByEntryId[assetId]

    diagnostics.remove diagnosticId, (err) =>
      @io.in('sub:entries').emit 'clear:diagnostics', assetId, diagnosticId
      return
    return

  _addDependencies: (assetId, dependencyEntryIds) =>
    assetId = parseInt(assetId) if typeof assetId == 'string'
    addedDependencyEntryIds = []
    missingAssetIds = []

    for depId in dependencyEntryIds
      depId = parseInt(depId) if typeof depId == 'string'
      depEntry = @data.entries.byId[depId]
      if ! depEntry? then missingAssetIds.push depId; continue

      dependentAssetIds = depEntry.dependentAssetIds
      if dependentAssetIds.indexOf(assetId) == -1
        dependentAssetIds.push assetId
        addedDependencyEntryIds.push depId

    if missingAssetIds.length > 0
      existingDiag = @data.entries.diagnosticsByEntryId[assetId].byId["missingDependencies"]
      if existingDiag? then missingAssetIds = missingAssetIds.concat existingDiag.data.missingAssetIds
      @_setDiagnostic assetId, "missingDependencies", "error", { missingAssetIds }

    if addedDependencyEntryIds.length > 0
      @io.in('sub:entries').emit 'add:dependencies', assetId, addedDependencyEntryIds

    return

  _removeDependencies: (assetId, dependencyEntryIds) =>
    assetId = parseInt(assetId) if typeof assetId == 'string'
    removedDependencyEntryIds = []
    missingAssetIds = []

    for depId in dependencyEntryIds
      depId = parseInt(depId) if typeof depId == 'string'
      depEntry = @data.entries.byId[depId]
      if ! depEntry? then missingAssetIds.push depId; continue

      dependentAssetIds = depEntry.dependentAssetIds
      index = dependentAssetIds.indexOf(assetId)
      if index != -1
        dependentAssetIds.splice(index, 1)
        removedDependencyEntryIds.push depId

    if missingAssetIds.length > 0
      existingDiag = @data.entries.diagnosticsByEntryId[assetId].byId["missingDependencies"]
      if existingDiag?
        for missingAssetId in missingAssetIds
          index = existingDiag.data.missingAssetIds.indexOf(missingAssetId)
          if index != -1
            existingDiag.data.missingAssetIds.splice index, 1

        if existingDiag.data.missingAssetIds.length == 0 then @_clearDiagnostic assetId, "missingDependencies"
        else @_setDiagnostic assetId, "missingDependencies", "error", existingDiag.data

    if removedDependencyEntryIds.length > 0
      @io.in('sub:entries').emit 'remove:dependencies', assetId, removedDependencyEntryIds

    return
