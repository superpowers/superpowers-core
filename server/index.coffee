exports.config = require './config'

# Globals
global.SupCore = require '../SupCore'
# global.SupSystem = require '../SupSystem'

# Projects
fs = require 'fs'
projectsPath = "#{__dirname}/../projects"
try fs.mkdirSync projectsPath

# Server
express = require 'express'
app = express()
app.use '/', express.static "#{__dirname}/../public"

httpServer = require('http').createServer app
io = require('socket.io') httpServer, { transports: ['websocket'] }

# Load plugins
pluginsPaths = { all: [], byAssetType: {} }
shouldIgnorePlugin = (pluginName) -> pluginName.indexOf('.') != -1 or pluginName == 'node_modules'

pluginsPath = "#{__dirname}/../plugins"
for pluginAuthor in fs.readdirSync pluginsPath
  pluginAuthorPath = "#{pluginsPath}/#{pluginAuthor}"

  for pluginName in fs.readdirSync pluginAuthorPath
    continue if shouldIgnorePlugin pluginName
    pluginPath = "#{pluginAuthorPath}/#{pluginName}"

    pluginsPaths.all.push "#{pluginAuthor}/#{pluginName}"
    pluginsPaths.byAssetType[assetType] = "#{pluginAuthor}/#{pluginName}" for assetType in fs.readdirSync "#{pluginPath}/editors"

    # Load API module
    apiModulePath = "#{pluginPath}/api"
    require apiModulePath if fs.existsSync apiModulePath

    # Expose public
    app.use "/plugins/#{pluginAuthor}/#{pluginName}", express.static "#{pluginsPath}/#{pluginAuthor}/#{pluginName}/public"

fs.writeFileSync "#{__dirname}/../public/plugins.json", JSON.stringify(pluginsPaths)

# Project hub
ProjectHub = require './ProjectHub'
hub = new ProjectHub io, projectsPath, (err) ->
  if err? then SupCore.log "Failed to start server:\n#{err.stack}"; return

  SupCore.log "Loaded #{Object.keys(hub.serversById).length} projects."
  httpServer.listen exports.config.port, -> SupCore.log "Server started."

# Save on exit
isQuitting = false
process.on 'SIGINT', ->
  return if isQuitting
  isQuitting = true
  httpServer.close()

  SupCore.log 'Saving all projects...'

  hub.saveAll (err) ->
    if err? then SupCore.log "Error while exiting:\n#{err}"
    else SupCore.log 'Exited cleanly.'
    process.exit()

  return
