import "../window";
import newProjectDialog from "../dialogs/newProject";
import * as async from "async";

let TreeView = require("dnd-tree-view");

let data: {
  projects: SupCore.Data.Projects;
  systemsByProjectType: { [title: string]: string; }
} = {} as any;

let ui: { projectsTreeView?: any } = {};
let socket: SocketIOClient.Socket;
let port = (window.location.port.length === 0) ? "80" : window.location.port;

function start() {
  document.querySelector(".server-name").textContent = `${window.location.hostname} on port ${port}`;

  ui.projectsTreeView = new TreeView(document.querySelector(".projects-tree-view"));
  ui.projectsTreeView.on("selectionChange", onProjectSelectionChange);
  ui.projectsTreeView.on("activate", onProjectActivate);

  document.querySelector(".projects-buttons .new-project").addEventListener("click", onNewProjectClick);
  document.querySelector(".projects-buttons .rename-project").addEventListener("click", onRenameProjectClick);
  document.querySelector(".projects-buttons .edit-description").addEventListener("click", onEditDescriptionClick);

  loadSystemsInfo(() => {
    socket = SupClient.connect(null, { reconnection: true });

    socket.on("error", onConnectionError);
    socket.on("connect", onConnected);
    socket.on("disconnect", onDisconnected);
  
    socket.on("add:projects", onProjectAdded);
    socket.on("setProperty:projects", onSetProjectProperty);
  });
}

start();

interface SystemManifest {
  title: string;
}

function loadSystemsInfo(callback: Function) {
  data.systemsByProjectType = {};
  
  window.fetch("/systems.json").then((response) => response.json()).then((systemsInfo: SupCore.SystemsInfo) => {
    async.each(systemsInfo.list, (systemName, cb) => {
      window.fetch(`/systems/${systemName}/manifest.json`).then((response) => response.json()).then((manifest: SystemManifest) => {
        data.systemsByProjectType[`${manifest.title} project`] = systemName;
        cb();
      });
    }, () => { callback(); });
  });
}

// Network callbacks
function onConnectionError() {
  window.location.replace("/login");
}

function onConnected() {
  socket.emit("sub", "projects", null, onProjectsReceived);

  const buttons = document.querySelectorAll(".projects-buttons button") as NodeListOf<HTMLButtonElement>;
  buttons[0].disabled = false;
  let noSelection = ui.projectsTreeView.selectedNodes.length === 0;
  for (let i = 1; i < buttons.length; i++) buttons[i].disabled = noSelection;
}

function onDisconnected() {
  data.projects = null;

  ui.projectsTreeView.clearSelection();
  ui.projectsTreeView.treeRoot.innerHTML = "";
  const buttons = document.querySelectorAll(".projects-buttons button") as NodeListOf<HTMLButtonElement>;
  for (let i = 0; i < buttons.length; i++) buttons[i].disabled = true;
}

function onProjectsReceived(err: string, projects: SupCore.Data.ProjectManifestPub[]) {
  data.projects = new SupCore.Data.Projects(projects);

  ui.projectsTreeView.clearSelection();
  ui.projectsTreeView.treeRoot.innerHTML = "";

  for (let manifest of projects) {
    const liElt = createProjectElement(manifest);
    ui.projectsTreeView.append(liElt, "item");
  }
}

function onProjectAdded(manifest: SupCore.Data.ProjectManifestPub, index: number) {
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
function createProjectElement(manifest: SupCore.Data.ProjectManifestPub) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = manifest.id;

  let icon = new Image();
  icon.src = `/projects/${manifest.id}/icon.png`;

  function onIconError() {
    icon.src = "/images/default-project-icon.png";
    icon.removeEventListener("error", onIconError);
  }
  icon.addEventListener("error", onIconError);
  liElt.appendChild(icon);

  let infoDiv = document.createElement("div");
  infoDiv.className = "info";
  liElt.appendChild(infoDiv);

  let nameDiv = document.createElement("div");
  nameDiv.className = "name";
  nameDiv.textContent = manifest.name;
  infoDiv.appendChild(nameDiv);

  let descriptionDiv = document.createElement("div");
  descriptionDiv.className = "description";
  descriptionDiv.textContent = manifest.description;
  infoDiv.appendChild(descriptionDiv);

  return liElt;
}

function onProjectSelectionChange() {
  const buttons = document.querySelectorAll(".projects-buttons button") as NodeListOf<HTMLButtonElement>;
  buttons[0].disabled = false;
  let noSelection = ui.projectsTreeView.selectedNodes.length === 0;
  for (let i = 1; i < buttons.length; i++) buttons[i].disabled = noSelection;
}

function onProjectActivate() {
  let href = `/project/?project=${ui.projectsTreeView.selectedNodes[0].dataset.id}`;

  // When in the app, use location.replace to avoid creating an history item
  // which could lead to accidentally navigating back by pressing Backspace
  if (SupClient.isApp) window.location.replace(`${window.location.origin}${href}`);
  else window.location.href = href;
}

let autoOpenProject = true;
function onNewProjectClick() {
  newProjectDialog(data.systemsByProjectType, autoOpenProject, (project, open) => {
    if (project == null) return;
    autoOpenProject = open;

    socket.emit("add:projects", project.name, project.description, project.system, project.icon, onProjectAddedAck);
  });
}

function onProjectAddedAck(err: string, id: string) {
  if (err != null) { alert(err); return; }

  ui.projectsTreeView.clearSelection();

  let node = ui.projectsTreeView.treeRoot.querySelector(`li[data-id='${id}']`);
  ui.projectsTreeView.addToSelection(node);
  ui.projectsTreeView.scrollIntoView(node);

  if (autoOpenProject) onProjectActivate();
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
