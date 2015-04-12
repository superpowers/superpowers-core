paths = require './paths'
config = require './config'

# Globals
global.SupAPI = require '../SupAPI'
global.SupCore = require '../SupCore'

SupCore.log "Server starting..."

# Server
express = require 'express'
app = express()
app.use '/', express.static "#{__dirname}/../public"

path = require 'path'
app.get '/builds/:projectId/:buildId/*', (req, res) ->
  projectServer = hub.serversById[req.params.projectId]
  if ! projectServer? then res.status(404).end("No such project"); return
  res.sendFile path.join(projectServer.projectPath, "builds", req.params.buildId, req.params[0]); return

app.use (err, req, res, next) ->
  if err.status == 404 then res.status(404).end("File not found"); return
  next(); return

httpServer = require('http').createServer app
io = require('socket.io') httpServer, { transports: ['websocket'] }

httpServer.on 'error', (err) =>
  if err.code == 'EADDRINUSE'
    SupCore.log "Could not start the server: another application is already listening on port #{config.port}."
    process.exit()
  else throw err

# Load plugins
fs = require 'fs'

pluginsPath = "#{__dirname}/../plugins"
shouldIgnorePlugin = (pluginName) -> pluginName.indexOf('.') != -1 or pluginName == 'node_modules'

# First pass
requiredPluginFiles = [ 'data', 'components', 'componentEditors', 'api', 'runtime' ]

for pluginAuthor in fs.readdirSync pluginsPath
  pluginAuthorPath = "#{pluginsPath}/#{pluginAuthor}"

  for pluginName in fs.readdirSync pluginAuthorPath
    continue if shouldIgnorePlugin pluginName
    pluginPath = "#{pluginAuthorPath}/#{pluginName}"

    # Load scripting API module
    apiModulePath = "#{pluginPath}/api"
    require apiModulePath if fs.existsSync apiModulePath

    # Expose public stuff
    app.use "/plugins/#{pluginAuthor}/#{pluginName}", express.static "#{pluginPath}/public"

    # Ensure all required files exist
    for requiredFile in requiredPluginFiles
      requiredFilePath = "#{pluginPath}/public/#{requiredFile}.js"
      if ! fs.existsSync requiredFilePath then fs.closeSync fs.openSync(requiredFilePath, 'w')

# Second pass, because data modules might depend on API modules
pluginsInfo = { all: [], editorsByAssetType: {}, toolsByName: {} }

for pluginAuthor in fs.readdirSync pluginsPath
  pluginAuthorPath = "#{pluginsPath}/#{pluginAuthor}"

  for pluginName in fs.readdirSync pluginAuthorPath
    continue if shouldIgnorePlugin pluginName
    pluginPath = "#{pluginAuthorPath}/#{pluginName}"

    # Load data module
    dataModulePath = "#{pluginPath}/data"
    require dataModulePath if fs.existsSync dataModulePath

    # Collect plugin info
    pluginsInfo.all.push "#{pluginAuthor}/#{pluginName}"
    if fs.existsSync "#{pluginPath}/editors"
      for editorName in fs.readdirSync "#{pluginPath}/editors"
        title = editorName
        try title = JSON.parse(fs.readFileSync("#{pluginPath}/public/editors/#{editorName}/locales/en/main.json", encoding: 'utf8')).title

        if SupCore.data.assetClasses[editorName]?
          pluginsInfo.editorsByAssetType[editorName] = {
            title: { en: title }
            pluginPath: "#{pluginAuthor}/#{pluginName}"
          }
        else
          pluginsInfo.toolsByName[editorName] = { pluginPath: "#{pluginAuthor}/#{pluginName}", title: { en: title } }

fs.writeFileSync "#{__dirname}/../public/plugins.json", JSON.stringify(pluginsInfo)

# Project hub
ProjectHub = require './ProjectHub'
hub = new ProjectHub io, paths.projects, (err) ->
  if err? then SupCore.log "Failed to start server:\n#{err.stack}"; return

  SupCore.log "Loaded #{Object.keys(hub.serversById).length} projects from #{paths.projects}."

  hostname = if config.password.length == 0 then 'localhost' else ''

  httpServer.listen config.port, hostname,  ->
    SupCore.log "Server started on port #{config.port}."
    if hostname == 'localhost' then SupCore.log "NOTE: Setup a password to allow other people to connect to your server."

# Save on exit and handle crashes
isQuitting = false

onExit = ->
  return if isQuitting
  isQuitting = true
  httpServer.close()

  SupCore.log 'Saving all projects...'

  hub.saveAll (err) ->
    if err? then SupCore.log "Error while exiting:\n#{err}"
    else SupCore.log 'Exited cleanly.'
    process.exit()

  return

process.on 'SIGINT', onExit
process.on 'message', (msg) -> if msg == 'stop' then onExit(); return

process.on 'uncaughtException', (err) ->
  SupCore.log "The server crashed.\n#{err.stack}"
  process.exit 1
  return
