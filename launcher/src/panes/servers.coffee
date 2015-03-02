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
  SupClient.dialogs.prompt "Enter the name of the server", "Enter a name", null, "OK", (name) =>
    return if ! name?
    
    SupClient.dialogs.prompt "Enter the address of the server", null, "127.0.0.1", "OK", (address) =>
      return if ! address?

      liElt = createServerElement { name, address }
      serversTreeView.append liElt, 'item'
      return
    return
  return

onRenameServerClick = ->
  return if serversTreeView.selectedNodes.length != 1

  node = serversTreeView.selectedNodes[0]
  
  SupClient.dialogs.prompt "Enter the new name of the server", null, node.dataset.name, "OK", (name) =>
    return if ! name?
    node.dataset.name = name
    node.querySelector('.name').textContent = name
    return
  return

onEditAddressClick = ->
  return if serversTreeView.selectedNodes.length != 1

  node = serversTreeView.selectedNodes[0]
  SupClient.dialogs.prompt "Enter the new address of the server", null, node.dataset.address, "OK", (address) =>
    return if ! address?
    node.dataset.address = address
    node.querySelector('.address').textContent = address
    return
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
