import "../window";
import CreateOrEditProjectDialog from "../dialogs/CreateOrEditProjectDialog";
import * as async from "async";

/* tslint:disable */
let TreeView = require("dnd-tree-view");
/* tslint:enable */

let data: {
  projects: SupCore.Data.Projects;
  systemTitlesByName: { [name: string]: string; }
  systemsByProjectType: { [title: string]: string; }
} = {} as any;

let ui: { projectsTreeView?: any } = {};
let socket: SocketIOClient.Socket;
let port = (window.location.port.length === 0) ? "80" : window.location.port;

function start() {
  document.querySelector(".server-name").textContent = `${window.location.hostname} on port ${port}`;

  ui.projectsTreeView = new TreeView(document.querySelector(".projects-tree-view"), { multipleSelection: false });
  ui.projectsTreeView.on("selectionChange", onProjectSelectionChange);
  ui.projectsTreeView.on("activate", onProjectActivate);

  document.querySelector(".projects-buttons .new-project").addEventListener("click", onNewProjectClick);
  document.querySelector(".projects-buttons .open-project").addEventListener("click", onProjectActivate);
  if ("ontouchstart" in window) (document.querySelector(".projects-buttons .open-project") as HTMLButtonElement).hidden = false;
  document.querySelector(".projects-buttons .edit-project").addEventListener("click", onEditProjectClick);

  loadSystemsInfo(() => {
    socket = SupClient.connect(null, { reconnection: true });

    socket.on("error", onConnectionError);
    socket.on("connect", onConnected);
    socket.on("disconnect", onDisconnected);

    socket.on("add:projects", onProjectAdded);
    socket.on("setProperty:projects", onSetProjectProperty);
    socket.on("updateIcon:projects", onUpdateProjectIcon);
  });
}

start();

interface SystemManifest {
  title: string;
}

function loadSystemsInfo(callback: Function) {
  data.systemTitlesByName = {};
  data.systemsByProjectType = {};

  window.fetch("/systems.json").then((response) => response.json()).then((systemsInfo: SupCore.SystemsInfo) => {
    async.each(systemsInfo.list, (systemName, cb) => {
      window.fetch(`/systems/${systemName}/manifest.json`).then((response) => response.json()).then((manifest: SystemManifest) => {
        data.systemTitlesByName[systemName] = manifest.title;
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
  SupClient.dialogs.cancelDialogIfAny();

  data.projects = null;

  ui.projectsTreeView.clearSelection();
  ui.projectsTreeView.treeRoot.innerHTML = "";
  const buttons = document.querySelectorAll(".projects-buttons button") as NodeListOf<HTMLButtonElement>;
  for (let i = 0; i < buttons.length; i++) buttons[i].disabled = true;

  (document.querySelector(".connecting") as HTMLDivElement).hidden = false;
}

function onProjectsReceived(err: string, projects: SupCore.Data.ProjectManifestPub[]) {
  data.projects = new SupCore.Data.Projects(projects);

  ui.projectsTreeView.clearSelection();
  ui.projectsTreeView.treeRoot.innerHTML = "";

  for (let manifest of projects) {
    const liElt = createProjectElement(manifest);
    ui.projectsTreeView.append(liElt, "item");
  }

  (document.querySelector(".connecting") as HTMLDivElement).hidden = true;
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

function onUpdateProjectIcon(id: string) {
  let projectElt = ui.projectsTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let iconElt = projectElt.querySelector("img") as HTMLImageElement;
  iconElt.src = `/projects/${id}/icon.png?${Date.now()}`;
}

// User interface
function createProjectElement(manifest: SupCore.Data.ProjectManifestPub) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = manifest.id;

  let iconElt = new Image();
  iconElt.src = `/projects/${manifest.id}/icon.png`;
  liElt.appendChild(iconElt);

  let infoElt = document.createElement("div");
  infoElt.className = "info";
  liElt.appendChild(infoElt);

  let nameElt = document.createElement("div");
  nameElt.className = "name";
  nameElt.textContent = manifest.name;
  infoElt.appendChild(nameElt);

  let detailsElt = document.createElement("div");
  detailsElt.className = "details";
  infoElt.appendChild(detailsElt);

  let descriptionElt = document.createElement("span");
  descriptionElt.className = "description";
  descriptionElt.textContent = manifest.description;
  detailsElt.appendChild(descriptionElt);

  let projectTypeSpan = document.createElement("span");
  projectTypeSpan.className = "project-type";
  projectTypeSpan.textContent = data.systemTitlesByName[manifest.system];
  detailsElt.appendChild(projectTypeSpan);

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
  /* tslint:disable:no-unused-expression */
  new CreateOrEditProjectDialog(data.systemsByProjectType, { autoOpen: autoOpenProject }, (project, open) => {
    /* tslint:enable:no-unused-expression */
    if (project == null) return;
    autoOpenProject = open;

    socket.emit("add:projects", project, onProjectAddedAck);
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

function onEditProjectClick() {
  if (ui.projectsTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.projectsTreeView.selectedNodes[0];
  let existingProject = data.projects.byId[selectedNode.dataset.id];

  /* tslint:disable:no-unused-expression */
  new CreateOrEditProjectDialog(data.systemsByProjectType, { existingProject }, (editedProject) => {
    /* tslint:enable:no-unused-expression */
    if (editedProject == null) return;

    delete editedProject.system;
    if (editedProject.icon == null) delete editedProject.icon;

    socket.emit("edit:projects", existingProject.id, editedProject, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}
