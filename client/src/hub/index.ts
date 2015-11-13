import * as async from "async";
import newProjectDialog from "../dialogs/newProject";

let TreeView = require("dnd-tree-view");

let data: {
  projects: SupCore.Data.Projects;
  systemsByProjectType: { [title: string]: string; }
} = {} as any;

let ui: { projectsTreeView?: any } = {};
let socket: SocketIOClient.Socket;

export default function hub() {
  let template = <any>document.getElementById("hub-template");
  let clone = document.importNode(template.content, true);
  document.body.appendChild(clone);

  let port = window.location.port;
  if (port.length === 0) port = "80";
  document.querySelector(".server-name").textContent = `${window.location.hostname} on port ${port}`;

  ui.projectsTreeView = new TreeView(document.querySelector(".projects-tree-view"));
  ui.projectsTreeView.on("activate", onProjectActivate);

  document.querySelector(".projects-buttons .new-project").addEventListener("click", onNewProjectClick);
  document.querySelector(".projects-buttons .rename-project").addEventListener("click", onRenameProjectClick);
  document.querySelector(".projects-buttons .edit-description").addEventListener("click", onEditDescriptionClick);

  loadSystemsInfo(() => {
    socket = SupClient.connect(null, { promptCredentials: true, reconnection: true });

    socket.on("connect", onConnected);
    socket.on("disconnect", onDisconnected);
  
    socket.on("add:projects", onProjectAdded);
    socket.on("setProperty:projects", onSetProjectProperty);
  });
}

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
function onConnected() {
  socket.emit("sub", "projects", null, onProjectsReceived);

  const buttons = document.querySelectorAll(".projects-buttons button") as NodeListOf<HTMLButtonElement>;
  for (let i = 0; i < buttons.length; i++) buttons[i].disabled = false;
}

function onDisconnected() {
  data.projects = null;

  const buttons = document.querySelectorAll(".projects-buttons button") as NodeListOf<HTMLButtonElement>;
  for (let i = 0; i < buttons.length; i++) buttons[i].disabled = true;
  ui.projectsTreeView.clearSelection();
  ui.projectsTreeView.treeRoot.innerHTML = "";
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

function onProjectActivate() {
  let search = `?project=${ui.projectsTreeView.selectedNodes[0].dataset.id}`;

  // When in NW.js, use location.replace to avoid creating an history item
  // which could lead to accidentally navigating back by pressing Backspace
  if ((<any>window).nwDispatcher != null) window.location.replace(`/${search}`);
  else window.location.search = search;
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
