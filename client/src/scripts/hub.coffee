TreeView = require 'dnd-tree-view'

data = null
ui = {}
socket = null

module.exports = ->
  template = document.getElementById('hub-template')
  clone = document.importNode template.content, true
  document.body.appendChild clone

  ui.projectsTreeView = new TreeView document.querySelector('.projects-tree-view'), onProjectsTreeViewDrop
  ui.projectsTreeView.on 'activate', onProjectActivate

  document.querySelector('.projects-buttons .new-project').addEventListener 'click', onNewProjectClick
  document.querySelector('.projects-buttons .rename-project').addEventListener 'click', onRenameProjectClick
  document.querySelector('.projects-buttons .edit-description').addEventListener 'click', onEditDescriptionClick

  socket = SupClient.connect()

  socket.on 'connect', onConnected
  socket.on 'disconnect', onDisconnected

  socket.on 'add:projects', onProjectAdded
  socket.on 'setProperty:projects', onSetProjectProperty

  return

# Network callbacks
onConnected = ->
  data = {}
  socket.emit 'sub', 'projects', null, onProjectsReceived
  return

onDisconnected = ->
  data = null
  return

onProjectsReceived = (err, projects) ->
  data.projects = new SupCore.data.Projects projects

  ui.projectsTreeView.clearSelection()
  ui.projectsTreeView.treeRoot.innerHTML = ''

  for manifest in projects
    liElt = createProjectElement manifest
    ui.projectsTreeView.append liElt, 'item'

  return

onProjectAdded = (manifest, index) ->
  data.projects.client_add manifest, index

  liElt = createProjectElement manifest
  ui.projectsTreeView.insertAt liElt, 'item', index
  return

onSetProjectProperty = (id, key, value) ->
  data.projects.client_setProperty id, key, value

  projectElt = ui.projectsTreeView.treeRoot.querySelector("[data-id='#{id}']")

  switch key
    when 'name'
      projectElt.querySelector('.name').textContent = value
    when 'description'
      projectElt.querySelector('.description').textContent = value

  return

# User interface
createProjectElement = (manifest) ->
  liElt = document.createElement('li')
  liElt.dataset.id = manifest.id

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = manifest.name
  liElt.appendChild nameSpan

  descriptionSpan = document.createElement('span')
  descriptionSpan.className = 'description'
  descriptionSpan.textContent = manifest.description
  liElt.appendChild descriptionSpan

  liElt

onProjectsTreeViewDrop = -> false

onProjectActivate = ->
  window.location = "?project=#{ui.projectsTreeView.selectedNodes[0].dataset.id}"
  return

onNewProjectClick = ->
  SupClient.dialogs.prompt "Enter the name of theproject", "Enter a name", null, "OK", (name) =>
    return if ! name?
    
    SupClient.dialogs.prompt "Enter the description of the project", "Enter the description", null, "OK", (description) =>
      description ?= ""
      socket.emit 'add:projects', name, description, (err, id) ->
        alert err if err?

        ui.projectsTreeView.clearSelection()
        ui.projectsTreeView.addToSelection ui.projectsTreeView.treeRoot.querySelector("li[data-id='#{id}']")
        return
      return
    return
  return

onRenameProjectClick = ->
  return if ui.projectsTreeView.selectedNodes.length != 1

  selectedNode = ui.projectsTreeView.selectedNodes[0]
  project = data.projects.byId[selectedNode.dataset.id]

  SupClient.dialogs.prompt "Enter the new name of the project", null, project.name, "OK", (newName) =>
    return if ! newName? or newName == project.name

    socket.emit 'setProperty:projects', project.id, 'name', newName, (err) ->
      alert err if err?
      return
    return
  return

onEditDescriptionClick = ->
  return if ui.projectsTreeView.selectedNodes.length != 1

  selectedNode = ui.projectsTreeView.selectedNodes[0]
  project = data.projects.byId[selectedNode.dataset.id]

  SupClient.dialogs.prompt "Enter the new description of the project", null, project.description, "OK", (newDescription) =>
    return if ! newDescription? or newDescription == project.description

    socket.emit 'setProperty:projects', project.id, 'description', newDescription, (err) ->
      alert err if err?
      return

    return
  return