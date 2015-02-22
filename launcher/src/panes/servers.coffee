TreeView = require 'dnd-tree-view'

config = require '../config'

start = ->
  for serverEntry in config.serverEntries
    liElt = createServerElement serverEntry
    serversTreeView.append liElt, 'item'

createServerElement = (entry) ->
  liElt = document.createElement('li')
  liElt.dataset.name = entry.name
  liElt.dataset.address = entry.address

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = entry.name
  liElt.appendChild nameSpan

  addressSpan = document.createElement('span')
  addressSpan.className = 'address'
  addressSpan.textContent = entry.address
  liElt.appendChild addressSpan

  liElt

onAddServerClick = ->
  name = prompt "Server name", "Server"; return if ! name?
  address = prompt "Server address", "127.0.0.1"; return if ! address?

  liElt = createServerElement { name, address }
  serversTreeView.append liElt, 'item'
  return

onRenameServerClick = ->
  return if serversTreeView.selectedNodes.length != 1

  node = serversTreeView.selectedNodes[0]
  serverName = prompt "New name", node.dataset.name; return if ! serverName?
  node.dataset.name = serverName
  node.querySelector('.name').textContent = serverName
  return

onEditAddressClick = ->
  return if serversTreeView.selectedNodes.length != 1

  node = serversTreeView.selectedNodes[0]
  serverAddress = prompt "New address", node.dataset.address; return if ! serverAddress?
  node.dataset.address = serverAddress
  node.querySelector('.address').textContent = serverAddress
  return

onServerActivate = ->
  window.open "http://" + serversTreeView.selectedNodes[0].dataset.address

serversTreeView = new TreeView document.querySelector('.servers-tree-view')
serversTreeView.on 'activate', onServerActivate

document.querySelector('.servers .buttons .add-server').addEventListener 'click', onAddServerClick
document.querySelector('.servers .buttons .rename-server').addEventListener 'click', onRenameServerClick
document.querySelector('.servers .buttons .edit-address').addEventListener 'click', onEditAddressClick

start()

exports.serversTreeView = serversTreeView
