fs = require 'fs'
path = require 'path'
async = require 'async'

ProjectServer = require './ProjectServer'
RemoteHubClient = require './RemoteHubClient'

module.exports = class ProjectHub

  constructor: (@globalIO, @projectsPath, callback) ->
    @api = {}
    @serversById = {}

    serveProjects = (callback) =>
      async.each fs.readdirSync(@projectsPath), (projectFolder, cb) =>
        @loadProject projectFolder, null, cb
        return
      , callback
      return

    setupProjectsList = (callback) =>
      data = ( server.api.manifest.pub for id, server of @serversById )
      @api.projects = new SupCore.api.Projects data
      callback(); return

    serve = (callback) =>
      @io = @globalIO.of('/hub')
      @io.on 'connection', @_addSocket
      callback(); return

    async.waterfall [ serveProjects, setupProjectsList, serve ], callback

  saveAll: (callback) ->
    async.each Object.keys(@serversById), (id, cb) =>
      @serversById[id].save cb
      return
    , callback
    return

  _addSocket: (socket) =>
    client = new RemoteHubClient @, socket
    # @clients.push client

  loadProject: (projectFolder, manifestData, callback) =>
    server = new ProjectServer @globalIO, path.join(@projectsPath, projectFolder), manifestData, (err) =>
      if err? then callback err; return

      @serversById[server.api.manifest.pub.id] = server
      callback(); return
    return

  removeRemoteClient: (client) =>
    # @clients.splice ...
