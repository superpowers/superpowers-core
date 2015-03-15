fs = require 'fs'
path = require 'path'
async = require 'async'
authMiddleware = require './authenticate'

ProjectServer = require './ProjectServer'
RemoteHubClient = require './RemoteHubClient'

module.exports = class ProjectHub

  constructor: (@globalIO, @projectsPath, callback) ->
    @data = {}
    @serversById = {}

    serveProjects = (callback) =>
      async.each fs.readdirSync(@projectsPath), (projectFolder, cb) =>
        if projectFolder.indexOf('.') != -1 then cb(); return
        @loadProject projectFolder, null, cb
        return
      , callback
      return

    setupProjectsList = (callback) =>
      data = ( server.data.manifest.pub for id, server of @serversById )
      @data.projects = new SupCore.data.Projects data
      callback(); return

    serve = (callback) =>
      @io = @globalIO.of('/hub')
      @io.use authMiddleware

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

      @serversById[server.data.manifest.pub.id] = server
      callback(); return
    return

  removeRemoteClient: (client) =>
    # @clients.splice ...
