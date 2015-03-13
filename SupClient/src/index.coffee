io = require 'socket.io-client'
Cookies = require 'cookies-js'

exports.ProjectClient = require './ProjectClient'
exports.component = require './component'
exports.dialogs = require './dialogs'

pluginsXHR = new XMLHttpRequest
pluginsXHR.open 'GET', '/plugins.json', false # Synchronous
pluginsXHR.send null

if pluginsXHR.status == 200
  exports.pluginPaths = JSON.parse(pluginsXHR.responseText)

exports.connect = (projectId, options={ reconnection: false }) ->
  namespace = if projectId? then "project:#{projectId}" else "hub"

  supServerAuth = Cookies.get 'supServerAuth'
  socket = io.connect "#{window.location.protocol}//#{window.location.host}/#{namespace}", transports: [ 'websocket' ], reconnection: options.reconnection, query: { supServerAuth }

  if options.promptCredentials then socket.on 'error', onSocketError
  socket

onSocketError = (error) ->
  document.body.innerHTML = ''
  if error == 'invalidCredentials'
    promptServerPassword (serverPassword) ->
      promptUsername (username) ->
        setupAuth serverPassword, username
        return
      return
  else if error = 'invalidUsername'
    promptUsername (username) ->
      setupAuth '', username
      return
  return

promptServerPassword = (callback) ->
  SupClient.dialogs.prompt "Please enter the server password.", '', '', "Connect", { type: 'password' }, callback
  return

promptUsername = (callback) ->
  SupClient.dialogs.prompt "Please choose a username.", '', '', "Connect", { pattern: '[A-Za-z0-9_]{3,20}' }, callback
  return

setupAuth = (serverPassword, username) ->
  Cookies.set 'supServerAuth', JSON.stringify({ serverPassword, username }), { expires: 60 * 60 * 24 * 365 }
  window.location.reload()
  return

exports.onAssetTrashed = ->
  document.body.innerHTML = ''

  h1 = document.createElement('h1')
  h1.textContent = 'This asset has been trashed'
  document.body.appendChild h1
  return

exports.onDisconnected = ->
  document.body.innerHTML = ''

  h1 = document.createElement('h1')
  h1.textContent = 'You were disconnected.'

  button = document.createElement('button')
  button.textContent = 'Reconnect'
  button.addEventListener 'click', => location.reload()

  div = document.createElement('div')
  div.appendChild h1
  div.appendChild button
  document.body.appendChild div
  return

exports.getTreeViewInsertionPoint = (treeView) ->
  selectedElt = treeView.selectedNodes[0]
  if selectedElt?
    if selectedElt.classList.contains 'group'
      parentId = parseInt selectedElt.dataset.id
    else
      if selectedElt.parentElement.classList.contains('children')
        parentId = parseInt selectedElt.parentElement.previousSibling.dataset.id

      index = 1
      while selectedElt.previousSibling?
        selectedElt = selectedElt.previousSibling
        index++ if selectedElt.tagName == 'LI'

  { parentId, index }

exports.getTreeViewDropPoint = (dropInfo, treeById) ->
  targetEntryId = parseInt(dropInfo.target.dataset.id)

  switch dropInfo.where
    when 'inside'
      parentNode = treeById.byId[targetEntryId]
      index = parentNode.children.length
    when 'above', 'below'
      targetNode = treeById.byId[targetEntryId]
      parentNode = treeById.parentNodesById[targetNode.id]

      index =
        if parentNode? then parentNode.children.indexOf(targetNode)
        else treeById.pub.indexOf(targetNode)

      index++ if dropInfo.where == 'below'

  { parentId: parentNode?.id, index }

exports.getListViewDropIndex = (dropInfo, listById) ->
  targetEntryId = parseInt(dropInfo.target.dataset.id)

  targetNode = listById.byId[targetEntryId]
  index = listById.pub.indexOf(targetNode)
  index++ if dropInfo.where == 'below'

  index

exports.findEntryByPath = (entries, path) ->
  parts =
    if typeof path == 'string' then path.split('/')
    else path

  for entry in entries
    if entry.name == parts[0]
      return entry if parts.length == 1
      continue if ! entry.children
      return exports.findEntryByPath entry.children, parts.slice(1)

  null
