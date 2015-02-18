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

    # Project
    @socket.on 'build:project', @_onBuildProject

  # TODO: Implement roles and capabilities
  can: (action) => true

  # Manifest

  _onSetManifestProperty: (key, value, callback) =>
    @server.api.manifest.setProperty key, value, (err, value) =>
      if err? then callback? err; return

      @server.io.in('sub:manifest').emit 'setProperty:manifest', key, value
      callback? null, value
      return
    return

  # Members

  _onRemoveMember: (id, callback) =>
    return if ! @errorIfCant 'editMembers', callback

    @server.api.members.remove id, (err) =>
      if err? then callback? err; return

      @server.io.in('sub:members').emit 'remove:members', id
      callback?()
      return
    return

  # Entries

  _onAddEntry: (name, type, options, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    entry = { name, type, diagnostics: [], dependentAssetIds: [] }

    @server.api.entries.add entry, options?.parentId, options?.index, (err, actualIndex) =>
      if err? then callback? err; return

      @server.api.internals.setProperty 'nextEntryId', @server.api.internals.pub.nextEntryId + 1

      onEntryCreated = =>
        @server.io.in('sub:entries').emit 'add:entries', entry, options?.parentId, actualIndex
        callback? null, entry.id

      if entry.type?
        assetClass = SupCore.api.assetPlugins[entry.type]
        asset = new assetClass
        asset.init()
        # FIXME: Use a nicer path than the asset id?
        assetPath = path.join(@server.projectPath, "assets/#{entry.id}")
        fs.mkdirSync assetPath
        asset.save assetPath, onEntryCreated
      else
        onEntryCreated()

      return

    return

  _onDuplicateEntry: (newName, id, options, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    entryToDuplicate = @server.api.entries.byId[id]
    if ! entryToDuplicate? then callback? "Entry #{id} doesn't exist"; return
    if ! entryToDuplicate.type? then callback? "Entry to duplicate must be an asset"; return

    entry =
      name: newName, type: entryToDuplicate.type
      diagnostics: _.cloneDeep(entryToDuplicate.diagnostics)
      dependentAssetIds: []

    @server.api.entries.add entry, options?.parentId, options?.index, (err, actualIndex) =>
      if err? then callback? err; return

      @server.api.internals.setProperty 'nextEntryId', @server.api.internals.pub.nextEntryId + 1

      newAssetPath = path.join(@server.projectPath, "assets/#{entry.id}")

      @server.api.assets.acquire id, (err, referenceAsset) =>
        fs.mkdirSync newAssetPath
        referenceAsset.save newAssetPath, (err) =>
          @server.api.assets.release id

          if err?
            @server.log "Failed to save duplicated asset at #{newAssetPath} (duplicating #{id})"
            @server.api.entries.remove entry.id, (err) => if err? then @server.log err; return
            callback? err; return

          @server.io.in('sub:entries').emit 'add:entries', entry, options?.parentId, actualIndex
          callback? null, entry.id
          return
    return

  _onMoveEntry: (id, parentId, index, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    @server.api.entries.move id, parentId, index, (err, actualIndex) =>
      if err? then callback? err; return

      @server.io.in('sub:entries').emit 'move:entries', id, parentId, actualIndex
      callback?()
      return

    return

  _onTrashEntry: (id, callback) =>
    return if ! @errorIfCant 'editAssets', callback

    dependentAssetIds = @server.api.entries.byId[id]?.dependentAssetIds

    @server.api.entries.remove id, (err) =>
      if err? then callback? err; return

      @server.io.in('sub:entries').emit 'trash:entries', id

      # Notify and clear all asset subscribers
      roomName = "sub:assets:#{id}"
      @server.io.in(roomName).emit 'trash:assets', id

      for socketId of @server.io.adapter.rooms[roomName]
        remoteClient = @server.clientsBySocketId[socketId]
        remoteClient.socket.leave roomName
        remoteClient.subscriptions.splice remoteClient.subscriptions.indexOf(roomName), 1

      # Generate diagnostics for any assets using this entry
      if dependentAssetIds?
        for dependentAssetId in dependentAssetIds
          missingAssetIds = [ id ]
          existingDiag = @server.api.entries.diagnosticsByEntryId[dependentAssetId].byId["missingDependencies"]
          if existingDiag? then missingAssetIds = missingAssetIds.concat existingDiag.data.missingAssetIds
          @server._setDiagnostic dependentAssetId, "missingDependencies", "error", { missingAssetIds }

      # Unload the asset
      @server.api.assets.releaseAll id

      callback?()
      return

    return

  _onSetEntryProperty: (id, key, value, callback) =>
    @server.api.entries.setProperty id, key, value, (err, value) =>
      if err? then callback? err; return

      @server.io.in('sub:entries').emit 'setProperty:entries', id, key, value
      callback?()
      return
    return

  # Assets
  _onEditAsset: (id, args..., callback) =>
    return if ! @errorIfCant 'editAssets', callback

    entry = @server.api.entries.byId[id]
    if ! entry?.type? then callback? "No such asset"; return
    if args.length == 0 then callback? "Invalid command"; return

    cmd = args[0]
    cmdArgs = args.slice(1)
    commandMethod = SupCore.api.assetPlugins[entry.type].prototype["server_#{cmd}"]
    if ! commandMethod? then callback? "Invalid command"; return
    # if ! callback? then @server.log "Ignoring edit:assets command, missing a callback"; return

    @server.api.assets.acquire id, (err, asset) =>
      commandMethod.call asset, @, cmdArgs..., (err, callbackArgs...) =>
        @server.api.assets.release id
        if err? then callback? err; return

        @server.io.in("sub:assets:#{id}").emit 'edit:assets', id, cmd, callbackArgs...
        callback? null, callbackArgs[0]?.id
      return
    return

  # Project
  _onBuildProject: (callback) =>
    @server.log "Building project..."

    buildId = @server.api.internals.pub.nextBuildId
    @server.api.internals.setProperty 'nextBuildId', @server.api.internals.pub.nextBuildId + 1

    projectBuildsPath = "#{__dirname}/../public/builds/#{@server.api.manifest.pub.id}/"
    buildPath = projectBuildsPath + buildId

    game = name: @server.api.manifest.pub.name, assets: @server.api.entries.getForStorage()

    try fs.mkdirSync "#{__dirname}/../public/builds"
    try fs.mkdirSync "#{__dirname}/../public/builds/#{@server.api.manifest.pub.id}"
    try fs.mkdirSync buildPath
    catch err then callback "Could not create folder for build #{buildId}"; return

    fs.mkdirSync path.join buildPath, 'assets'

    assetIdsToExport = []
    @server.api.entries.walk (entry, parent) => if entry.type? then assetIdsToExport.push entry.id; return

    async.each assetIdsToExport, (assetId, cb) =>
      folderPath = path.join(buildPath, 'assets', assetId.toString())
      fs.mkdir folderPath, (err) =>
        @server.api.assets.acquire assetId, (err, asset) =>
          asset.save folderPath, (err) =>
            @server.api.assets.release assetId
            cb(); return
          return
        return
      return
    , (err) =>
      if err? then callback "Could not export all assets"; return

      json = JSON.stringify(game, null, 2)
      fs.writeFile path.join(buildPath, 'game.json'), json, { encoding: 'utf8' }, (err) =>
        if err? then callback "Could not save game.json"; return

        @server.log "Done generating build #{buildId}..."

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
