TreeView = require 'dnd-tree-view'
dialogs = require '../../../SupClient/src/dialogs'
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
  dialogs.prompt "Enter a name for the server.", "Enter a name", null, "Add server", (name) =>
    return if ! name?

    dialogs.prompt "Enter the server address.", null, "127.0.0.1", "Add server", (address) =>
      return if ! address?

      liElt = createServerElement { name, address }
      serversTreeView.append liElt, 'item'
      return
    return
  return

onRenameServerClick = ->
  return if serversTreeView.selectedNodes.length != 1

  node = serversTreeView.selectedNodes[0]

  dialogs.prompt "Enter a new name for the server.", null, node.dataset.name, "Rename", (name) =>
    return if ! name?
    node.dataset.name = name
    node.querySelector('.name').textContent = name
    return
  return

onEditAddressClick = ->
  return if serversTreeView.selectedNodes.length != 1

  node = serversTreeView.selectedNodes[0]
  dialogs.prompt "Enter the new server address.", null, node.dataset.address, "Update", (address) =>
    return if ! address?
    node.dataset.address = address
    node.querySelector('.address').textContent = address
    return
  return

onServerActivate = ->
  gui = global.window.nwDispatcher.requireNwGui()
  gui.Window.open "http://" + serversTreeView.selectedNodes[0].dataset.address,
    "title": "Superpowers",
    "icon": "icon.png",
    "width": 1000,
    "height": 600,
    "min_width": 800,
    "min_height": 480,
    "toolbar": false,
    "frame": true
  return

serversTreeView = new TreeView document.querySelector('.servers-tree-view')
serversTreeView.on 'activate', onServerActivate

document.querySelector('.servers .buttons .add-server').addEventListener 'click', onAddServerClick
document.querySelector('.servers .buttons .rename-server').addEventListener 'click', onRenameServerClick
document.querySelector('.servers .buttons .edit-address').addEventListener 'click', onEditAddressClick

start()

exports.serversTreeView = serversTreeView
