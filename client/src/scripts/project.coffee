TreeView = require 'dnd-tree-view'
TabStrip = require 'tab-strip'

info = {}
data = null
ui = {}
socket = null

module.exports = (projectId) ->
  info.projectId = projectId

  template = document.getElementById('project-template')
  clone = document.importNode template.content, true
  document.body.appendChild clone

  # Hot-keys
  document.addEventListener 'keydown', (event) =>
    if event.keyCode == 79 and event.ctrlKey then event.preventDefault()
    return
  document.addEventListener 'keyup', (event) =>
    if event.keyCode == 79 and event.ctrlKey and ! document.querySelector(".dialog")?
      openSearchEntryDialog()
    return

  # Project info
  document.querySelector('.project .project-name').textContent = projectId

  document.querySelector('.project-buttons .run').addEventListener 'click', onRunProjectClick
  document.querySelector('.project-buttons .debug').addEventListener 'click', onDebugProjectClick

  # Entries tree view
  ui.entriesTreeView = new TreeView document.querySelector('.entries-tree-view'), onEntryDrop
  ui.entriesTreeView.on 'selectionChange', updateSelectedEntry
  ui.entriesTreeView.on 'activate', onEntryActivate

  document.querySelector('.entries-buttons .new-asset').addEventListener 'click', onNewAssetClick
  document.querySelector('.entries-buttons .new-folder').addEventListener 'click', onNewFolderClick
  document.querySelector('.entries-buttons .search').addEventListener 'click', onSearchClick
  document.querySelector('.entries-buttons .open-entry').addEventListener 'click', onOpenEntryClick
  document.querySelector('.entries-buttons .rename-entry').addEventListener 'click', onRenameEntryClick
  document.querySelector('.entries-buttons .duplicate-entry').addEventListener 'click', onDuplicateEntryClick
  document.querySelector('.entries-buttons .trash-entry').addEventListener 'click', onTrashEntryClick

  # Tab strip
  ui.tabStrip = new TabStrip document.querySelector('.tabs-bar')
  ui.tabStrip.on 'activateTab', onTabActivate
  ui.tabStrip.on 'closeTab', onTabClose

  # Panes
  ui.panesElt = document.querySelector('.project .main .panes')

  # Home tab
  tab = document.createElement('li')

  tabLabel = document.createElement('span')
  tabLabel.classList.add 'label'
  tabLabel.textContent = "Home"

  tab.dataset.pane = 'home'
  tab.appendChild tabLabel

  tab.classList.add 'active'
  ui.tabStrip.tabsRoot.appendChild tab

  iframe = document.createElement('iframe')
  iframe.dataset.name = 'home'
  iframe.src = "/plugins/home/?project=#{info.projectId}"
  iframe.classList.add 'active'
  ui.panesElt.appendChild iframe

  # Network
  socket = SupClient.connect projectId, { reconnection: true }

  socket.on 'connect', onConnected
  socket.on 'disconnect', onDisconnected

  socket.on 'setProperty:manifest', onSetManifestProperty

  socket.on 'add:entries', onEntryAdded
  socket.on 'move:entries', onEntryMoved
  socket.on 'trash:entries', onEntryTrashed
  socket.on 'setProperty:entries', onSetEntryProperty

  socket.on 'set:diagnostics', onDiagnosticSet
  socket.on 'clear:diagnostics', onDiagnosticCleared

  socket.on 'add:dependencies', onDependenciesAdded
  socket.on 'remove:dependencies', onDependenciesRemoved

  return

# Network callbacks
onConnected = ->
  data = {}
  socket.emit 'sub', 'manifest', null, onManifestReceived
  socket.emit 'sub', 'entries', null, onEntriesReceived
  return

onDisconnected = ->
  data = null
  ui.entriesTreeView.clearSelection()
  ui.entriesTreeView.treeRoot.innerHTML = ''
  updateSelectedEntry()

  document.querySelector('.project-buttons .run').disabled = true
  document.querySelector('.project-buttons .debug').disabled = true
  document.querySelector('.entries-buttons .new-asset').disabled = true
  document.querySelector('.entries-buttons .new-folder').disabled = true
  document.querySelector('.entries-buttons .search').disabled = true
  document.querySelector('.connecting').style.display = ''
  return

onManifestReceived = (err, manifest) ->
  data.manifest = new SupCore.data.Manifest manifest

  document.querySelector('.project .project-name').textContent = manifest.name
  return

onEntriesReceived = (err, entries) ->
  data.entries = new SupCore.data.Entries entries

  ui.entriesTreeView.clearSelection()
  ui.entriesTreeView.treeRoot.innerHTML = ''

  document.querySelector('.connecting').style.display = 'none'
  document.querySelector('.project-buttons .run').disabled = false
  document.querySelector('.project-buttons .debug').disabled = false
  document.querySelector('.entries-buttons .new-asset').disabled = false
  document.querySelector('.entries-buttons .new-folder').disabled = false
  document.querySelector('.entries-buttons .search').disabled = false

  walk = (entry, parentEntry, parentElt) ->
    liElt = createEntryElement entry
    liElt.classList.add "collapsed"

    nodeType = if entry.children? then 'group' else 'item'
    ui.entriesTreeView.append liElt, nodeType, parentElt

    if entry.children?
      walk child, entry, liElt for child in entry.children

    return

  walk entry, null, null for entry in entries
  return

onSetManifestProperty = (key, value) ->
  data.manifest.client_setProperty key, value

  switch key
    when 'name'
      document.querySelector('.project .project-name').textContent = value

  return

onEntryAdded = (entry, parentId, index) ->
  data.entries.client_add entry, parentId, index

  liElt = createEntryElement entry
  nodeType = if entry.children? then 'group' else 'item'

  if parentId?
    parentElt = ui.entriesTreeView.treeRoot.querySelector("[data-id='#{parentId}']")

  ui.entriesTreeView.insertAt liElt, nodeType, index, parentElt
  return

onEntryAddedAck = (err, id) ->
  if err? then alert err; return

  ui.entriesTreeView.clearSelection()
  ui.entriesTreeView.addToSelection ui.entriesTreeView.treeRoot.querySelector("li[data-id='#{id}']")
  updateSelectedEntry()
  return

onEntryMoved = (id, parentId, index) ->
  data.entries.client_move id, parentId, index

  entryElt = ui.entriesTreeView.treeRoot.querySelector("[data-id='#{id}']")
  nodeType = if entryElt.classList.contains('group') then 'group' else 'item'

  if parentId?
    parentElt = ui.entriesTreeView.treeRoot.querySelector("[data-id='#{parentId}']")

  ui.entriesTreeView.insertAt entryElt, nodeType, index, parentElt

  refreshAssetTabElement data.entries.byId[id]
  return

onEntryTrashed = (id) ->
  data.entries.client_remove id

  entryElt = ui.entriesTreeView.treeRoot.querySelector("[data-id='#{id}']")
  ui.entriesTreeView.remove entryElt
  return

onSetEntryProperty = (id, key, value) ->
  data.entries.client_setProperty id, key, value

  entryElt = ui.entriesTreeView.treeRoot.querySelector("[data-id='#{id}']")

  switch key
    when 'name'
      entryElt.querySelector('.name').textContent = value
      refreshAssetTabElement data.entries.byId[id]

  return

onDiagnosticSet = (id, newDiag) ->
  diagnostics = data.entries.diagnosticsByEntryId[id]

  existingDiag = diagnostics.byId[newDiag.id]
  if existingDiag?
    existingDiag.type = newDiag.type
    existingDiag.data = newDiag.data
  else
    diagnostics.client_add newDiag

  diagnosticsElt = ui.entriesTreeView.treeRoot.querySelector("[data-id='#{id}'] .diagnostics")
  diagSpan = document.createElement('span')
  diagSpan.className = newDiag.id
  diagSpan.textContent = newDiag.id
  diagnosticsElt.appendChild diagSpan
  return

onDiagnosticCleared = (id, diagId) ->
  diagnostics = data.entries.diagnosticsByEntryId[id]
  diagnostics.client_remove diagId

  diagElt = ui.entriesTreeView.treeRoot.querySelector("[data-id='#{id}'] .diagnostics .#{diagId}")
  diagElt.parentElement.removeChild diagElt
  return

onDependenciesAdded = (id, depIds) ->
  data.entries.byId[depId].dependentAssetIds.push id for depId in depIds
  return

onDependenciesRemoved = (id, depIds) ->
  for depId in depIds
    dependentAssetIds = data.entries.byId[depId].dependentAssetIds
    dependentAssetIds.splice dependentAssetIds.indexOf(id), 1

  return

# User interface
onRunProjectClick = ->
  window.open 'data:text/html;charset=utf-8,Building...', 'player'

  socket.emit 'build:project', (err, buildId) ->
    if err? then alert err; return

    window.open "/player?project=#{info.projectId}&build=#{buildId}", 'player'
    return
  return

onDebugProjectClick = ->
  window.open 'data:text/html;charset=utf-8,Building...', 'player'

  socket.emit 'build:project', (err, buildId) ->
    if err? then alert err; return

    window.open "/player?project=#{info.projectId}&build=#{buildId}&debug", 'player'
    return
  return

createEntryElement = (entry) ->
  liElt = document.createElement('li')
  liElt.dataset.id = entry.id

  if entry.type?
    iconElt = document.createElement('img')
    iconElt.src = "/plugins/#{SupClient.pluginPaths.byAssetType[entry.type]}/editors/#{entry.type}/icon.svg"
    liElt.appendChild iconElt

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = entry.name
  liElt.appendChild nameSpan

  if entry.type?
    diagnosticsSpan = document.createElement('span')
    diagnosticsSpan.className = 'diagnostics'

    for diag in entry.diagnostics
      diagSpan = document.createElement('span')
      diagSpan.className = diag.id
      diagSpan.textContent = diag.id
      diagnosticsSpan.appendChild diagSpan

    liElt.appendChild diagnosticsSpan

  liElt

onEntryDrop = (dropInfo, orderedNodes) ->
  { parentId, index } = SupClient.getTreeViewDropPoint dropInfo, data.entries

  entryIds = ( parseInt(entry.dataset.id) for entry in orderedNodes )

  sourceParentNode = data.entries.parentNodesById[entryIds[0]]
  sourceChildren = sourceParentNode?.children ? data.entries.pub
  sameParent = parentId == sourceParentNode?.id

  i = 0
  for id in entryIds
    socket.emit 'move:entries', id, parentId, index + i, (err) -> if err? then alert err; return
    if ! sameParent or sourceChildren.indexOf(data.entries.byId[id]) >= index then i++

  false

updateSelectedEntry = ->
  for button in document.querySelectorAll('.entries-buttons .edit button')
    disabled = ui.entriesTreeView.selectedNodes.length == 0 or
      (button.classList.contains('single') and ui.entriesTreeView.selectedNodes.length != 1) or
      (button.classList.contains('asset-only') and ui.entriesTreeView.selectedNodes[0].classList.contains('group'))

    button.disabled = disabled

  return

onEntryActivate = ->
  activatedEntry = ui.entriesTreeView.selectedNodes[0]
  openEntry activatedEntry.dataset.id
  return

openSearchEntryDialog = ->
  entries = []
  data.entries.walk (node) =>
    entries.push data.entries.getPathFromId node.id if node.type?
    return

  SupClient.dialogs.filter entries, "Asset Name", (entryPath) =>
    return if ! entryPath?
    openEntry SupClient.findEntryByPath(data.entries.pub, entryPath).id
    return

openEntry = (id) ->
  entry = data.entries.byId[id]

  if ! entry.type?
    # Just toggle the folder
    activatedEntry.classList.toggle 'collapsed'
    return

  ui.tabStrip.tabsRoot.querySelector('.active').classList.remove 'active'
  ui.panesElt.querySelector('iframe.active').classList.remove 'active'

  tab = ui.tabStrip.tabsRoot.querySelector("li[data-asset-id='#{id}']")
  iframe = ui.panesElt.querySelector("iframe[data-asset-id='#{id}']")

  if ! tab?
    tab = createAssetTabElement entry
    ui.tabStrip.tabsRoot.appendChild tab

    iframe = document.createElement('iframe')
    iframe.src = "/plugins/#{SupClient.pluginPaths.byAssetType[entry.type]}/editors/#{entry.type}/?project=#{info.projectId}&asset=#{id}"
    iframe.dataset.assetId = id
    ui.panesElt.appendChild iframe
    iframe.contentWindow.focus()

  tab.classList.add 'active'
  iframe.classList.add 'active'

  return

onNewAssetClick = ->
  SupClient.dialogs.prompt "Enter a name for the new asset.", "Asset name", null, "Create", (name) =>
    return if ! name?

    SupClient.dialogs.select "Choose a type for the new asset.", Object.keys(SupClient.pluginPaths.byAssetType), "Create", (type) =>
      return if ! type?

      socket.emit 'add:entries', name, type, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck
    return
  return

onNewFolderClick = ->
  SupClient.dialogs.prompt "Enter a name for the new folder.", "Enter a name", null, "Create", (name) =>
    return if ! name?

    socket.emit 'add:entries', name, null, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck
    return
  return

onSearchClick = ->
  openSearchEntryDialog()
  return

onTrashEntryClick = ->
  return if ui.entriesTreeView.selectedNodes.length == 0

  selectedEntries = []

  checkNextEntry = =>
    selectedEntries.splice(0, 1)
    if selectedEntries.length == 0
      SupClient.dialogs.confirm "Are you sure you want to trash the selected entries?", "Trash", (confirm) =>
        return if ! confirm

        trashEntry = (entry) =>
          if ! entry.type?
            trashEntry entryChild for entryChild in entry.children

          socket.emit 'trash:entries', entry.id, (err) ->
            alert err if err?
            return

        for selectedNode in ui.entriesTreeView.selectedNodes
          entry = data.entries.byId[parseInt(selectedNode.dataset.id)]
          trashEntry entry

        ui.entriesTreeView.clearSelection()
        return

    else
      warnBrokenDependence selectedEntries[0]
    return

  warnBrokenDependence = (entry) =>
    if ! entry.type?
      selectedEntries.push entryChild for entryChild in entry.children

    if entry.dependentAssetIds?.length > 0
      dependentAssetNames = ( data.entries.byId[usingId].name for usingId in entry.dependentAssetIds )
      SupClient.dialogs.info "#{entry.name} is used in #{dependentAssetNames.join(', ')}.", "Close", =>
        checkNextEntry()
        return
    else
      checkNextEntry()

  for selectedNode in ui.entriesTreeView.selectedNodes
    selectedEntries.push data.entries.byId[parseInt(selectedNode.dataset.id)]
  warnBrokenDependence selectedEntries[0]
  return

onOpenEntryClick = ->
  return if ui.entriesTreeView.selectedNodes.length != 1

  selectedNode = ui.entriesTreeView.selectedNodes[0]
  entry = data.entries.byId[parseInt(selectedNode.dataset.id)]

  window.open "#{window.location.origin}/plugins/#{SupClient.pluginPaths.byAssetType[entry.type]}/editors/#{entry.type}/?project=#{info.projectId}&asset=#{entry.id}"
  return

onRenameEntryClick = ->
  return if ui.entriesTreeView.selectedNodes.length != 1

  selectedNode = ui.entriesTreeView.selectedNodes[0]
  entry = data.entries.byId[parseInt(selectedNode.dataset.id)]

  SupClient.dialogs.prompt "Enter a new name for the asset.", null, entry.name, "Rename", (newName) =>
    return if ! newName? or newName == entry.name

    socket.emit 'setProperty:entries', entry.id, 'name', newName, (err) ->
      alert err if err?
      return
    return
  return

onDuplicateEntryClick = ->
  return if ui.entriesTreeView.selectedNodes.length != 1

  selectedNode = ui.entriesTreeView.selectedNodes[0]
  entry = data.entries.byId[parseInt(selectedNode.dataset.id)]
  return if ! entry.type?

  SupClient.dialogs.prompt "Enter a name for the new asset.", null, entry.name, "Duplicate", (newName) =>
    return if ! newName?

    socket.emit 'duplicate:entries', newName, entry.id, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck
    return
  return

createAssetTabElement = (entry) =>
  tabElt = document.createElement('li')

  if entry.type?
    iconElt = document.createElement('img')
    iconElt.classList.add 'icon'
    iconElt.src = "/plugins/#{SupClient.pluginPaths.byAssetType[entry.type]}/editors/#{entry.type}/icon.svg"
    tabElt.appendChild iconElt

  tabLabel = document.createElement('span')
  tabLabel.classList.add 'label'
  tabLabel.textContent = entry.name
  tabElt.appendChild tabLabel

  closeButton = document.createElement('button')
  closeButton.classList.add 'close'
  closeButton.addEventListener 'click', => onTabClose tabElt; return
  tabElt.appendChild closeButton

  tabElt.title = data.entries.getPathFromId entry.id
  tabElt.dataset.assetId = entry.id
  tabElt

refreshAssetTabElement = (entry) ->
  tabElt = ui.tabStrip.tabsRoot.querySelector("[data-asset-id='#{entry.id}']")
  return if ! tabElt?

  tabElt.querySelector('.label').textContent = entry.name
  tabElt.title = data.entries.getPathFromId entry.id
  return

onTabActivate = (tabElement) =>
  ui.tabStrip.tabsRoot.querySelector('.active').classList.remove 'active'
  ui.panesElt.querySelector('iframe.active').classList.remove 'active'

  tabElement.classList.add 'active'
  assetId = tabElement.dataset.assetId

  if assetId?
    ui.panesElt.querySelector("iframe[data-asset-id='#{assetId}']").classList.add 'active'
  else
    ui.panesElt.querySelector("iframe[data-name='#{tabElement.dataset.pane}']").classList.add 'active'
  return

onTabClose = (tabElement) =>
  assetId = tabElement.dataset.assetId
  return if ! assetId?

  if tabElement.classList.contains 'active'
    activeTabElement = tabElement.nextSibling ? tabElement.previousSibling
    onTabActivate activeTabElement

  tabElement.parentElement.removeChild tabElement

  frameElt = ui.panesElt.querySelector("iframe[data-asset-id='#{assetId}']")
  frameElt.parentElement.removeChild frameElt

  return
