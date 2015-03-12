BaseRemoteClient = require './BaseRemoteClient'
async = require 'async'
fs = require 'fs'
path = require 'path'

module.exports = class RemoteHubClient extends BaseRemoteClient

  constructor: (server, socket) ->
    super server, socket

    # Projects
    @socket.on 'add:projects', @_onAddProject
    @socket.on 'setProperty:projects', @_onSetProjectProperty

  # TODO: Implement roles and capabilities
  can: (action) => true

  _onAddProject: (name, description, callback) =>
    return if ! @errorIfCant 'editProjects', callback

    manifest = { name, description }

    # TODO: use lodash 3.0 with string methods when it's released
    projectFolder = manifest.name.toLowerCase().slice(0, 16).replace /[^a-z0-9]/g, '-'
    originalProjectFolder = projectFolder
    projectFolderNumber = 1

    loop
      try fs.mkdirSync path.join(@server.projectsPath, projectFolder)
      catch
        projectFolder = "#{originalProjectFolder}-#{projectFolderNumber++}"
        continue
      break

    projectPath = path.join(@server.projectsPath, projectFolder)
    fs.mkdirSync path.join(projectPath, 'assets')
    fs.mkdirSync path.join(projectPath, 'rooms')

    @server.data.projects.add manifest, null, (err, actualIndex) =>
      if err? then callback? err; return

      writeManifest = (callback) =>
        manifestJSON = JSON.stringify manifest, null, 2
        fs.writeFile path.join(projectPath, 'manifest.json'), manifestJSON, { encoding: 'utf8' }, callback
        return

      writeInternals = (callback) =>
        internalsJSON = JSON.stringify { nextBuildId: 0, nextEntryId: 0 }, null, 2
        fs.writeFile path.join(projectPath, 'internals.json'), internalsJSON, { encoding: 'utf8' }, callback
        return

      writeMembers = (callback) =>
        # TODO: Add the project creator
        membersJSON = JSON.stringify [], null, 2
        fs.writeFile path.join(projectPath, 'members.json'), membersJSON, { encoding: 'utf8' }, callback
        return

      writeEntries = (callback) =>
        entriesJSON = JSON.stringify [], null, 2
        fs.writeFile path.join(projectPath, 'entries.json'), entriesJSON, { encoding: 'utf8' }, callback
        return

      loadProject = (callback) => @server.loadProject projectFolder, manifest, callback; return

      async.waterfall [ writeManifest, writeInternals, writeMembers, writeEntries, loadProject ], (err) =>
        if err? then SupCore.log "Error while creating project:\n#{err}"; return

        @server.io.in('sub:projects').emit 'add:projects', manifest, actualIndex
        callback? null, manifest.id
      return

    return

  _onSetProjectProperty: (id, key, value, callback) =>
    projectServer = @server.serversById[id]
    if ! projectServer? then callback? "Invalid project id"; return

    projectServer.data.manifest.setProperty key, value, (err, value) =>
      if err? then callback? err; return

      projectServer.io.in('sub:manifest').emit 'setProperty:manifest', key, value
      @server.io.in('sub:projects').emit 'setProperty:projects', id, key, value
      callback?()
      return
    return
