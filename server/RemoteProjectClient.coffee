BaseRemoteClient = require './BaseRemoteClient'
config = require './config'
path = require 'path'
fs = require 'fs'
rimraf = require 'rimraf'
async = require 'async'
_ = require 'lodash'

module.exports = class RemoteProjectClient extends BaseRemoteClient

  constructor: (server, @id, socket) ->
    super server, socket
    @socket.emit 'welcome', @id

    # Manifest
    @socket.on 'setProperty:manifest', @_onSetManifestProperty

    # Members
    @socket.on 'remove:members', @_onRemoveMember

    # Entries
    @socket.on 'add:entries', @_onAddEntry
    @socket.on 'duplicate:entries', @_onDuplicateEntry
    @socket.on 'move:entries', @_onMoveEntry
    @socket.on 'trash:entries', @_onTrashEntry
    @socket.on 'setProperty:entries', @_onSetEntryProperty

    # Assets
    @socket.on 'edit:assets', @_onEditAsset

    # Rooms
    @socket.on 'edit:rooms', @_onEditRoom

    # Project
    @socket.on 'build:project', @_onBuildProject

  # TODO: Implement roles and capabilities
  can: (action) => true

  # Manifest

  _onSetManifestProperty: (key, value, callback) =>
    @server.data.manifest.setProperty key, value, (err, value) =>
      if err? then callback? err; return

      @server.io.in('sub:manifest').emit 'setProperty:manifest', key, value
      callback? null, value
      return
    return

  # Members

  _onRemoveMember: (id, callback) =>
    return if ! @errorIfCant 'editMembers', callback

    @server.data.members.remove id, (err) =>
      if err? then callback? err; return

      @server.io.in('sub:members').emit 'remove:members', id
      callback?()
      return
    return

  # Entries

  _onAddEntry: (name, type, options, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    entry = { name, type, diagnostics: [], dependentAssetIds: [] }

    @server.data.entries.add entry, options?.parentId, options?.index, (err, actualIndex) =>
      if err? then callback? err; return

      @server.data.internals.setProperty 'nextEntryId', @server.data.internals.pub.nextEntryId + 1

      onEntryCreated = =>
        @server.io.in('sub:entries').emit 'add:entries', entry, options?.parentId, actualIndex
        callback? null, entry.id

      if entry.type?
        assetClass = SupCore.data.assetClasses[entry.type]
        asset = new assetClass null, @server.data, entry.type.split('.')[0]
        asset.init { name: entry.name }, =>
          assetPath = path.join(@server.projectPath, "assets/#{entry.id}")
          fs.mkdirSync assetPath
          asset.save assetPath, onEntryCreated
      else
        onEntryCreated()

      return

    return

  _onDuplicateEntry: (newName, id, options, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    entryToDuplicate = @server.data.entries.byId[id]
    if ! entryToDuplicate? then callback? "Entry #{id} doesn't exist"; return
    if ! entryToDuplicate.type? then callback? "Entry to duplicate must be an asset"; return

    entry =
      name: newName, type: entryToDuplicate.type
      diagnostics: _.cloneDeep(entryToDuplicate.diagnostics)
      dependentAssetIds: []

    @server.data.entries.add entry, options?.parentId, options?.index, (err, actualIndex) =>
      if err? then callback? err; return

      @server.data.internals.setProperty 'nextEntryId', @server.data.internals.pub.nextEntryId + 1

      newAssetPath = path.join(@server.projectPath, "assets/#{entry.id}")

      @server.data.assets.acquire id, null, (err, referenceAsset) =>
        fs.mkdirSync newAssetPath
        referenceAsset.save newAssetPath, (err) =>
          @server.data.assets.release id

          if err?
            @server.log "Failed to save duplicated asset at #{newAssetPath} (duplicating #{id})"
            @server.data.entries.remove entry.id, (err) => if err? then @server.log err; return
            callback? err; return

          @server.io.in('sub:entries').emit 'add:entries', entry, options?.parentId, actualIndex
          callback? null, entry.id
          return
    return

  _onMoveEntry: (id, parentId, index, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    @server.data.entries.move id, parentId, index, (err, actualIndex) =>
      if err? then callback? err; return

      @server.io.in('sub:entries').emit 'move:entries', id, parentId, actualIndex
      callback?()
      return

    return

  _onTrashEntry: (id, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    entry = @server.data.entries.byId[id]
    dependentAssetIds = entry?.dependentAssetIds

    # Clear all dependencies for this entry
    dependencies = @server.data.entries.dependenciesByAssetId[id]
    if dependencies?
      removedDependencyEntryIds = []
      for depId in dependencies
        depId = parseInt(depId) if typeof depId == 'string'
        depEntry = @server.data.entries.byId[depId]
        if ! depEntry? then continue

        dependentAssetIds = depEntry.dependentAssetIds
        index = dependentAssetIds.indexOf(id)
        if index != -1
          dependentAssetIds.splice(index, 1)
          removedDependencyEntryIds.push depId

      if removedDependencyEntryIds.length > 0
        @server.io.in('sub:entries').emit 'remove:dependencies', id, dependencies

      delete @server.data.entries.dependenciesByAssetId[id]

    # Delete the entry
    @server.data.entries.remove id, (err) =>
      if err? then callback? err; return

      @server.io.in('sub:entries').emit 'trash:entries', id

      # Notify and clear all asset subscribers
      roomName = "sub:assets:#{id}"
      @server.io.in(roomName).emit 'trash:assets', id

      for socketId of @server.io.adapter.rooms[roomName]
        remoteClient = @server.clientsBySocketId[socketId]
        remoteClient.socket.leave roomName
        remoteClient.subscriptions.splice remoteClient.subscriptions.indexOf(roomName), 1

      # Generate diagnostics for any assets depending on this entry
      if dependentAssetIds?
        for dependentAssetId in dependentAssetIds
          missingAssetIds = [ id ]
          existingDiag = @server.data.entries.diagnosticsByEntryId[dependentAssetId].byId["missingDependencies"]
          if existingDiag? then missingAssetIds = missingAssetIds.concat existingDiag.data.missingAssetIds
          @server._setDiagnostic dependentAssetId, "missingDependencies", "error", { missingAssetIds }

      # Unload the asset
      @server.data.assets.releaseAll id

      callback?()
      return

    return

  _onSetEntryProperty: (id, key, value, callback) =>
    @server.data.entries.setProperty id, key, value, (err, value) =>
      if err? then callback? err; return

      @server.io.in('sub:entries').emit 'setProperty:entries', id, key, value
      callback?()
      return
    return

  # Assets
  _onEditAsset: (id, args..., callback) =>
    return if ! @errorIfCant 'editAssets', callback

    entry = @server.data.entries.byId[id]
    if ! entry?.type? then callback? "No such asset"; return
    if args.length == 0 then callback? "Invalid command"; return

    cmd = args[0]
    cmdArgs = args.slice(1)
    commandMethod = SupCore.data.assetClasses[entry.type].prototype["server_#{cmd}"]
    if ! commandMethod? then callback? "Invalid command"; return
    # if ! callback? then @server.log "Ignoring edit:assets command, missing a callback"; return

    @server.data.assets.acquire id, null, (err, asset) =>
      if err? then callback? err; return

      commandMethod.call asset, @, cmdArgs..., (err, callbackArgs...) =>
        @server.data.assets.release id
        if err? then callback? err; return

        @server.io.in("sub:assets:#{id}").emit 'edit:assets', id, cmd, callbackArgs...
        callback? null, callbackArgs[0]?.id
      return
    return

  # Rooms
  _onEditRoom: (id, args..., callback) =>
    return if ! @errorIfCant 'editRooms', callback

    if args.length == 0 then callback? "Invalid command"; return

    cmd = args[0]
    cmdArgs = args.slice(1)
    commandMethod = SupCore.data.Room.prototype["server_#{cmd}"]
    if ! commandMethod? then callback? "Invalid command"; return
    # if ! callback? then @server.log "Ignoring edit:rooms command, missing a callback"; return

    @server.data.rooms.acquire id, null, (err, room) =>
      if err? then callback? err; return

      commandMethod.call room, @, cmdArgs..., (err, callbackArgs...) =>
        @server.data.rooms.release id
        if err? then callback? err; return

        @server.io.in("sub:rooms:#{id}").emit 'edit:rooms', id, cmd, callbackArgs...
        callback? null, callbackArgs[0]?.id
      return
    return

  # Project
  _onBuildProject: (callback) =>
    #@server.log "Building project..."

    buildId = @server.data.internals.pub.nextBuildId
    @server.data.internals.setProperty 'nextBuildId', buildId + 1

    projectBuildsPath = "#{@server.projectPath}/builds/"
    buildPath = projectBuildsPath + buildId

    game = name: @server.data.manifest.pub.name, assets: @server.data.entries.getForStorage()

    try fs.mkdirSync projectBuildsPath
    try fs.mkdirSync buildPath
    catch err then callback "Could not create folder for build #{buildId}"; return

    fs.mkdirSync path.join buildPath, 'assets'

    assetIdsToExport = []
    @server.data.entries.walk (entry, parent) => if entry.type? then assetIdsToExport.push entry.id; return

    async.each assetIdsToExport, (assetId, cb) =>
      folderPath = path.join(buildPath, 'assets', assetId.toString())
      fs.mkdir folderPath, (err) =>
        @server.data.assets.acquire assetId, null, (err, asset) =>
          asset.save folderPath, (err) =>
            @server.data.assets.release assetId
            cb(); return
          return
        return
      return
    , (err) =>
      if err? then callback "Could not export all assets"; return

      json = JSON.stringify(game, null, 2)
      fs.writeFile path.join(buildPath, 'game.json'), json, { encoding: 'utf8' }, (err) =>
        if err? then callback "Could not save game.json"; return

        #@server.log "Done generating build #{buildId}..."

        callback null, buildId

        # Remove an old build to avoid using too much disk space
        buildToDeleteId = buildId - config.maxRecentBuilds
        buildToDeletePath = projectBuildsPath + buildToDeleteId
        rimraf buildToDeletePath, (err) =>
          if err?
            @server.log "Failed to remove build #{buildToDeleteId}:"
            @server.log err

      return

    return
