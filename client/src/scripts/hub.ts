let TreeView = require("dnd-tree-view");

let data: {projects?: SupCore.data.Projects};
let ui: { projectsTreeView?: any } = {};
let socket: SocketIOClient.Socket;

export default function hub() {
  let template = <any>document.getElementById("hub-template");
  let clone = document.importNode(template.content, true);
  document.body.appendChild(clone);

  let port = window.location.port;
  if (port.length === 0) port = "80";
  document.querySelector(".server-name").textContent = `${window.location.hostname} on port ${port}`;

  ui.projectsTreeView = new TreeView(document.querySelector(".projects-tree-view"), onProjectsTreeViewDrop);
  ui.projectsTreeView.on("activate", onProjectActivate);

  document.querySelector(".projects-buttons .new-project").addEventListener("click", onNewProjectClick);
  document.querySelector(".projects-buttons .rename-project").addEventListener("click", onRenameProjectClick);
  document.querySelector(".projects-buttons .edit-description").addEventListener("click", onEditDescriptionClick);

  socket = SupClient.connect(null, { promptCredentials: true, reconnection: false });

  socket.on("connect", onConnected);
  socket.on("disconnect", onDisconnected);

  socket.on("add:projects", onProjectAdded);
  socket.on("setProperty:projects", onSetProjectProperty);
}

// Network callbacks
function onConnected() {
  data = {};
  socket.emit("sub", "projects", null, onProjectsReceived);
}

function onDisconnected() {
  data = null;
}

function onProjectsReceived(err: string, projects: SupCore.data.ProjectItem[]) {
  data.projects = new SupCore.data.Projects(projects);

  ui.projectsTreeView.clearSelection();
  ui.projectsTreeView.treeRoot.innerHTML = "";

  for (let manifest of projects) {
    let liElt = createProjectElement(manifest);
    ui.projectsTreeView.append(liElt, "item");
  }
}

function onProjectAdded(manifest: SupCore.data.ProjectItem, index: number) {
  data.projects.client_add(manifest, index);

  let liElt = createProjectElement(manifest);
  ui.projectsTreeView.insertAt(liElt, "item", index);
}

function onSetProjectProperty(id: string, key: string, value: any) {
  data.projects.client_setProperty(id, key, value);

  let projectElt = ui.projectsTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  switch (key) {
    case "name":
      projectElt.querySelector(".name").textContent = value;
      break;
    case "description":
      projectElt.querySelector(".description").textContent = value;
      break;
  }
}

// User interface
function createProjectElement(manifest: SupCore.data.ProjectItem) {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).id = manifest.id;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = manifest.name;
  liElt.appendChild(nameSpan);

  let descriptionSpan = document.createElement("span");
  descriptionSpan.className = "description";
  descriptionSpan.textContent = manifest.description;
  liElt.appendChild(descriptionSpan);

  return liElt;
}

function onProjectsTreeViewDrop() { return false; }

function onProjectActivate() {
  window.location.search = `?project=${ui.projectsTreeView.selectedNodes[0].dataset.id}`;
}

function onNewProjectClick() {
  SupClient.dialogs.prompt("Enter a name for the project.", "My project", null, "Create", (name) => {
    if (name == null) return;

    SupClient.dialogs.prompt("Enter a description for the project.", "Project description", null, "Create", { required: false }, (description) => {
      if (description == null) description = "";
      socket.emit("add:projects", name, description, (err: string, id: string) => {
        if (err != null) { alert(err); return; }

        ui.projectsTreeView.clearSelection()
        ui.projectsTreeView.addToSelection(ui.projectsTreeView.treeRoot.querySelector(`li[data-id='${id}']`));
      });
    });
  });
}

function onRenameProjectClick() {
  if (ui.projectsTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.projectsTreeView.selectedNodes[0];
  let project = data.projects.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the project.", null, project.name, "Rename", (newName) => {
    if (newName == null || newName === project.name) return;

    socket.emit("setProperty:projects", project.id, "name", newName, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}

function onEditDescriptionClick() {
  if (ui.projectsTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.projectsTreeView.selectedNodes[0];
  let project = data.projects.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new description for the project.", null, project.description, "Update", { required: false }, (newDescription) => {
    if (newDescription == null || newDescription === project.description) return;

    socket.emit("setProperty:projects", project.id, "description", newDescription, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}
