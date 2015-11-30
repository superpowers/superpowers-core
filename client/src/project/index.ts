import "../window";
import CreateAssetDialog from "../dialogs/CreateAssetDialog";
import FindAssetDialog from "../dialogs/FindAssetDialog";
import * as async from "async";

let nodeRequire = require;
/* tslint:disable */
let TreeView = require("dnd-tree-view");
let PerfectResize = require("perfect-resize");
let TabStrip = require("tab-strip");
/* tslint:enable */

let socket: SocketIOClient.Socket;

interface EditorManifest {
  title: string;
  // assetType: string; <- for asset editors, soon
  pinned?: boolean;
  pluginPath: string;
}

let data: {
  buildPort?: number;
  systemName?: string;
  manifest?: SupCore.Data.ProjectManifest;
  entries?: SupCore.Data.Entries;

  assetTypesByTitle?: { [title: string]: string; };
  editorsByAssetType?: { [assetType: string]: EditorManifest };
  toolsByName?: { [name: string]: EditorManifest };
};

let ui: {
  entriesTreeView?: any;
  openInNewWindowButton?: HTMLButtonElement;
  tabStrip?: any;

  homeTab?: HTMLLIElement;
  panesElt?: HTMLDivElement;
  toolsElt?: HTMLUListElement;
} = {};

// FIXME: Use propertype when Electron typings have been updated
let electron: {
  remote: GitHubElectron.Remote;
  ipcRenderer: GitHubElectron.InProcess;
};

let runWindow: GitHubElectron.BrowserWindow;

if (SupClient.isApp) {
  electron = nodeRequire("electron");

  window.addEventListener("beforeunload", () => {
    if (runWindow != null) runWindow.removeListener("closed", onCloseRunWindow);
  });
}

function start() {
  if (SupClient.query.project == null) goToHub();

  // Development mode
  if (localStorage.getItem("superpowers-dev-mode") != null) {
    let projectManagementDiv = <HTMLDivElement>document.querySelector(".project-management");
    projectManagementDiv.style.backgroundColor = "#37d";

    // According to http://stackoverflow.com/a/12747364/915914, window.onerror
    // should be used rather than window.addEventListener("error", ...);
    // to get all errors, including syntax errors.
    window.onerror = onWindowDevError;
  }

  // Hot-keys
  SupClient.setupHotkeys();
  document.addEventListener("keydown", (event) => {
    if (document.querySelector(".dialog") != null) return;

    if (event.keyCode === 113) { // F2
      event.preventDefault();
      onRenameEntryClick();
    }

    if (event.keyCode === 68 && (event.ctrlKey || event.metaKey)) { // Ctrl+D
      event.preventDefault();
      onDuplicateEntryClick();
    }

    if (event.keyCode === 46) { // Delete
      event.preventDefault();
      onTrashEntryClick();
    }
  });

  // Make sidebar resizable
  new PerfectResize(document.querySelector(".sidebar"), "left");

  // Project info
  document.querySelector(".project-icon .go-to-hub").addEventListener("click", () => { goToHub(); });
  document.querySelector(".project-buttons .run").addEventListener("click", () => { runProject(); });
  document.querySelector(".project-buttons .publish").addEventListener("click", () => { publishProject(); });
  document.querySelector(".project-buttons .debug").addEventListener("click", () => { runProject({ debug: true }); });
  document.querySelector(".project-buttons .stop").addEventListener("click", () => { stopProject(); });

  if (!SupClient.isApp) {
    (<HTMLButtonElement>document.querySelector(".project-buttons .publish")).title = "Publish project (only works from the Superpowers app for technical reasons)";
    (<HTMLButtonElement>document.querySelector(".project-buttons .debug")).hidden = true;
    (<HTMLButtonElement>document.querySelector(".project-buttons .stop")).hidden = true;
  }

  // Entries tree view
  ui.entriesTreeView = new TreeView(document.querySelector(".entries-tree-view"), { dropCallback: onEntryDrop });
  ui.entriesTreeView.on("selectionChange", updateSelectedEntry);
  ui.entriesTreeView.on("activate", onEntryActivate);

  document.querySelector(".entries-buttons .new-asset").addEventListener("click", onNewAssetClick);
  document.querySelector(".entries-buttons .new-folder").addEventListener("click", onNewFolderClick);
  document.querySelector(".entries-buttons .search").addEventListener("click", onSearchEntryDialog);
  document.querySelector(".entries-buttons .rename-entry").addEventListener("click", onRenameEntryClick);
  document.querySelector(".entries-buttons .duplicate-entry").addEventListener("click", onDuplicateEntryClick);
  document.querySelector(".entries-buttons .trash-entry").addEventListener("click", onTrashEntryClick);

  ui.openInNewWindowButton = document.createElement("button");
  ui.openInNewWindowButton.className = "open-in-new-window";
  ui.openInNewWindowButton.title = "Open in new window";
  ui.openInNewWindowButton.addEventListener("click", onOpenInNewWindowClick);

  // Tab strip
  let tabsBarElt = document.querySelector(".tabs-bar");
  ui.tabStrip = new TabStrip(tabsBarElt);
  ui.tabStrip.on("activateTab", onTabActivate);
  ui.tabStrip.on("closeTab", onTabClose);

  // Prevent <iframe> panes from getting mouse event while dragging tabs
  function restorePanesMouseEvent(event: any) {
    ui.panesElt.style.pointerEvents = "";
    document.removeEventListener("mouseup", restorePanesMouseEvent);
  }

  tabsBarElt.addEventListener("mousedown", (event) => {
    ui.panesElt.style.pointerEvents = "none";
    document.addEventListener("mouseup", restorePanesMouseEvent);
  });

  // Global controls
  let toggleNotificationsButton = <HTMLButtonElement>document.querySelector(".top .controls button.toggle-notifications");
  toggleNotificationsButton.addEventListener("click", onClickToggleNotifications);

  if (localStorage.getItem("superpowers-disable-notifications") != null) {
    toggleNotificationsButton.classList.add("disabled");
    toggleNotificationsButton.title = "Click to enable notifications";
  } else {
    toggleNotificationsButton.classList.remove("disabled");
    toggleNotificationsButton.title = "Click to disable notifications";
  }

  // Panes and tools
  ui.panesElt = <HTMLDivElement>document.querySelector(".main .panes");
  ui.toolsElt = <HTMLUListElement>document.querySelector(".sidebar .tools ul");

  // Messaging
  window.addEventListener("message", onMessage);

  connect();
}

start();

function connect() {
  socket = SupClient.connect(SupClient.query.project, { reconnection: true });

  socket.on("error", onConnectionError);
  socket.on("disconnect", onDisconnected);

  socket.on("welcome", onWelcome);
  socket.on("setProperty:manifest", onSetManifestProperty);
  socket.on("updateIcon:manifest", onUpdateProjectIcon);

  socket.on("add:entries", onEntryAdded);
  socket.on("move:entries", onEntryMoved);
  socket.on("trash:entries", onEntryTrashed);
  socket.on("setProperty:entries", onSetEntryProperty);

  socket.on("set:badges", onBadgeSet);
  socket.on("clear:badges", onBadgeCleared);

  socket.on("add:dependencies", onDependenciesAdded);
  socket.on("remove:dependencies", onDependenciesRemoved);
}

function setupAssetTypes(editorPaths: { [assetType: string]: string; }, callback: Function) {
  data.editorsByAssetType = {};
  data.assetTypesByTitle = {};

  let pluginsRoot = `/systems/${data.systemName}/plugins`;

  async.each(Object.keys(editorPaths), (assetType, cb) => {
    let pluginPath = editorPaths[assetType];
    window.fetch(`${pluginsRoot}/${pluginPath}/editors/${assetType}/manifest.json`)
    .then((response) => response.json())
    .then((manifest: EditorManifest) => {
      manifest.pluginPath = pluginPath;
      data.editorsByAssetType[assetType] = manifest;
      cb();
    })
    .catch((error) => {
      data.editorsByAssetType[assetType] = { title: assetType, pluginPath };
      cb();
    });
  }, () => {
    let assetTypes = Object.keys(data.editorsByAssetType);
    assetTypes.sort((a, b) => data.editorsByAssetType[a].title.localeCompare(data.editorsByAssetType[b].title));

    for (let assetType of assetTypes) {
      let manifest = data.editorsByAssetType[assetType];
      data.assetTypesByTitle[manifest.title] = assetType;
    }
    callback();
  });
}

function setupTools(toolPaths: { [name: string]: string; }, callback: Function) {
  data.toolsByName = {};

  let pluginsRoot = `/systems/${data.systemName}/plugins`;

  async.each(Object.keys(toolPaths), (toolName, cb) => {
    let pluginPath = toolPaths[toolName];
    window.fetch(`${pluginsRoot}/${pluginPath}/editors/${toolName}/manifest.json`)
    .then((response) => response.json())
    .then((manifest: EditorManifest) => {
      data.toolsByName[toolName] = manifest;
      data.toolsByName[toolName].pluginPath = pluginPath;
      cb();
    })
    .catch((error) => {
      data.toolsByName[toolName] = { title: toolName, pinned: false, pluginPath };
      cb();
    });
  }, () => {
    ui.toolsElt.innerHTML = "";

    let toolNames = Object.keys(data.toolsByName);
    toolNames.sort((a, b) => data.toolsByName[a].title.localeCompare(data.toolsByName[b].title));

    for (let toolName of toolNames) setupTool(toolName);
    callback();
  });
}

function setupTool(toolName: string) {
  let tool = data.toolsByName[toolName];

  if (tool.pinned) {
    // TODO: Support multiple pinned tabs
    ui.homeTab = openTool(toolName);
    return;
  }

  let toolElt = document.createElement("li");
  toolElt.dataset["name"] = toolName;
  let containerElt = document.createElement("div");
  toolElt.appendChild(containerElt);

  let iconElt = document.createElement("img");
  iconElt.src = `/systems/${data.systemName}/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg`;
  containerElt.appendChild(iconElt);

  let nameSpanElt = document.createElement("span");
  nameSpanElt.className = "name";
  nameSpanElt.textContent = tool.title;
  containerElt.appendChild(nameSpanElt);

  toolElt.addEventListener("mouseenter", (event: any) => { event.target.appendChild(ui.openInNewWindowButton); });
  toolElt.addEventListener("mouseleave", (event) => {
    if (ui.openInNewWindowButton.parentElement != null) ui.openInNewWindowButton.parentElement.removeChild(ui.openInNewWindowButton);
  });
  nameSpanElt.addEventListener("click", (event: any) => { openTool(event.target.parentElement.parentElement.dataset.name); });
  ui.toolsElt.appendChild(toolElt);
}

// Network callbacks
function onConnectionError() {
  let redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.replace(`/login?redirect=${redirect}`);
}

function onDisconnected() {
  SupClient.dialogs.cancelDialogIfAny();

  data = null;
  ui.entriesTreeView.clearSelection();
  ui.entriesTreeView.treeRoot.innerHTML = "";
  updateSelectedEntry();

  (<HTMLButtonElement>document.querySelector(".project-buttons .run")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".project-buttons .debug")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".project-buttons .stop")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".project-buttons .publish")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-asset")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-folder")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .search")).disabled = true;
  (<HTMLDivElement>document.querySelector(".connecting")).hidden = false;
}

function onWelcome(clientId: number, config: { buildPort: number; systemName: string; }) {
  data = {
    buildPort: config.buildPort,
    systemName: config.systemName
  };

  window.fetch(`/systems/${data.systemName}/plugins.json`).then((response) => response.json()).then((pluginsInfo: SupCore.PluginsInfo) => {

    async.parallel([
      (cb: Function) => { setupAssetTypes(pluginsInfo.paths.editors, cb); },
      (cb: Function) => { setupTools(pluginsInfo.paths.tools, cb); }
    ], (err) => {
      if (err) throw err;
      socket.emit("sub", "manifest", null, onManifestReceived);
      socket.emit("sub", "entries", null, onEntriesReceived);
    });
  });
}

function onManifestReceived(err: string, manifest: any) {
  data.manifest = new SupCore.Data.ProjectManifest(manifest);

  document.querySelector(".project-name").textContent = manifest.name;
  document.title = `${manifest.name} — Superpowers`;
}

function onEntriesReceived(err: string, entries: SupCore.Data.EntryNode[]) {
  data.entries = new SupCore.Data.Entries(entries);

  ui.entriesTreeView.clearSelection();
  ui.entriesTreeView.treeRoot.innerHTML = "";

  (<HTMLDivElement>document.querySelector(".connecting")).hidden = true;

  if (SupClient.isApp) (<HTMLButtonElement>document.querySelector(".project-buttons .publish")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".project-buttons .run")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".project-buttons .debug")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-asset")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-folder")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .search")).disabled = false;

  function walk(entry: SupCore.Data.EntryNode, parentEntry: SupCore.Data.EntryNode, parentElt: HTMLLIElement) {
    let liElt = createEntryElement(entry);
    liElt.classList.add("collapsed");

    let nodeType = (entry.children != null) ? "group" : "item";
    ui.entriesTreeView.append(liElt, nodeType, parentElt);

    if (entry.children != null) for (let child of entry.children) walk(child, entry, liElt);
  }
  for (let entry of entries) walk(entry, null, null);
}

function onSetManifestProperty(key: string, value: any) {
  data.manifest.client_setProperty(key, value);

  switch (key) {
    case "name":
      document.querySelector(".project-name").textContent = value;
      break;
  }
}

function onUpdateProjectIcon() {
  // TODO: Update favicon?
}

function onEntryAdded(entry: SupCore.Data.EntryNode, parentId: string, index: number) {
  data.entries.client_add(entry, parentId, index);

  let liElt = createEntryElement(entry);
  let nodeType = (entry.children != null) ? "group" : "item";

  let parentElt: HTMLLIElement;
  if (parentId != null) {
    parentElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
    let parentEntry = data.entries.byId[parentId];
    let childrenElt = parentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  ui.entriesTreeView.insertAt(liElt, nodeType, index, parentElt);
}

let autoOpenAsset = true;
function onEntryAddedAck(err: string, id: string) {
  if (err != null) { alert(err); return; }

  ui.entriesTreeView.clearSelection();
  ui.entriesTreeView.addToSelection(ui.entriesTreeView.treeRoot.querySelector(`li[data-id='${id}']`));
  updateSelectedEntry();

  if (autoOpenAsset) openEntry(id);
}

function onEntryMoved(id: string, parentId: string, index: number) {
  data.entries.client_move(id, parentId, index);

  let entryElt = <HTMLLIElement>ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  let oldParentId: string = entryElt.dataset["parentId"];
  if (oldParentId != null) {
    let oldParentElt = <HTMLLIElement>ui.entriesTreeView.treeRoot.querySelector(`[data-id='${oldParentId}']`);
    let parentEntry = data.entries.byId[oldParentId];
    let childrenElt = oldParentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  let nodeType = (entryElt.classList.contains("group")) ? "group" : "item";

  let parentElt: HTMLLIElement;
  if (parentId != null) {
    parentElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
    let parentEntry = data.entries.byId[parentId];
    let childrenElt = parentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  ui.entriesTreeView.insertAt(entryElt, nodeType, index, parentElt);
  if (parentId != null) entryElt.dataset["parentId"] = parentId;
  else delete entryElt.dataset["parentId"];

  updateEntryElementPath(id);
  refreshAssetTabElement(data.entries.byId[id]);
}

function updateEntryElementPath(id: string) {
  let entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  entryElt.dataset["dndText"] = data.entries.getPathFromId(id);

  let node = data.entries.byId[id];
  if (node.children != null) {
    for (let child of node.children) updateEntryElementPath(child.id);
  }
}

function onEntryTrashed(id: string) {
  data.entries.client_remove(id);

  let entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  let oldParentId: string = entryElt.dataset["parentId"];
  if (oldParentId != null) {
    let oldParentElt = <HTMLLIElement>ui.entriesTreeView.treeRoot.querySelector(`[data-id='${oldParentId}']`);
    let parentEntry = data.entries.byId[oldParentId];
    let childrenElt = oldParentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  ui.entriesTreeView.remove(entryElt);
}

function onSetEntryProperty(id: string, key: string, value: any) {
  data.entries.client_setProperty(id, key, value);

  let entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  switch (key) {
    case "name":
      entryElt.querySelector(".name").textContent = value;
      updateEntryElementPath(id);

      let walk = (entry: SupCore.Data.EntryNode) => {
        refreshAssetTabElement(entry);
        if (entry.children != null) for (let child of entry.children) walk(child);
      };

      walk(data.entries.byId[id]);
      break;
  }
}

function onBadgeSet(id: string, newBadge: SupCore.Data.BadgeItem) {
  let badges = data.entries.badgesByEntryId[id];

  let existingBadge = badges.byId[newBadge.id];
  if (existingBadge != null) {
    existingBadge.type = newBadge.type;
    existingBadge.data = newBadge.data;
  } else badges.client_add(newBadge, null);

  let badgesElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}'] .badges`);
  let badgeSpan = document.createElement("span");
  badgeSpan.className = newBadge.id;
  badgeSpan.textContent = newBadge.id;
  badgesElt.appendChild(badgeSpan);
}

function onBadgeCleared(id: string, badgeId: string) {
  let badges = data.entries.badgesByEntryId[id];
  badges.client_remove(badgeId);

  let badgeElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}'] .badges .${badgeId}`);
  badgeElt.parentElement.removeChild(badgeElt);
}

function onDependenciesAdded(id: string, depIds: string[]) {
  for (let depId of depIds) data.entries.byId[depId].dependentAssetIds.push(id);
}

function onDependenciesRemoved(id: string, depIds: string[]) {
  for (let depId of depIds) {
    let dependentAssetIds = data.entries.byId[depId].dependentAssetIds;
    dependentAssetIds.splice(dependentAssetIds.indexOf(id), 1);
  }
}

// User interface
function goToHub() { window.location.replace("/"); }

function runProject(options: { debug: boolean; } = { debug: false }) {
  if (SupClient.isApp) {
    if (runWindow == null) {
      runWindow = new ((electron.remote as any).BrowserWindow as typeof GitHubElectron.BrowserWindow)({
        title: "Superpowers", icon: `public/images/icon.png`,
        width: 1000, height: 600,
        "min-width": 800, "min-height": 480
      });
      runWindow.setMenuBarVisibility(false);
      runWindow.on("closed", onCloseRunWindow);

      (document.querySelector(".project-buttons") as HTMLDivElement).classList.toggle("running", true);
    }
    runWindow.loadUrl(`${window.location.origin}/build.html`);
    runWindow.focus();

    (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = false;
  } else window.open("/build.html", `player_${SupClient.query.project}`);

  socket.emit("build:project", (err: string, buildId: string) => {
    if (err != null) { alert(err); return; }

    let url = `${window.location.protocol}//${window.location.hostname}:${data.buildPort}/systems/${data.systemName}/?project=${SupClient.query.project}&build=${buildId}`;
    if (options.debug) url += "&debug";

    if (SupClient.isApp) {
      if (runWindow != null) runWindow.loadUrl(url);
    } else window.open(url, `player_${SupClient.query.project}`);
  });
}

function onCloseRunWindow() {
  runWindow = null;
  (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = true;
}

function stopProject() {
  runWindow.destroy();
  runWindow = null;

  (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = true;
}

function publishProject() {
  if (SupClient.isApp) electron.ipcRenderer.send("choose-export-folder");
}

if (SupClient.isApp) {
  electron.ipcRenderer.on("export-folder-failed", (event: any, message: string) => { alert(message); });
  electron.ipcRenderer.on("export-folder-success", (event: any, outputFolder: string) => {
    socket.emit("build:project", (err: string, buildId: string, files: any) => {
      let address = `${window.location.protocol}//${window.location.hostname}`;
      electron.ipcRenderer.send("export", { projectId: SupClient.query.project, buildId, address, mainPort: window.location.port, buildPort: data.buildPort, outputFolder, files });
    });
  });
}

function showDevTools() {
  if (electron != null) electron.remote.getCurrentWindow().toggleDevTools();
}

function createEntryElement(entry: SupCore.Data.EntryNode) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = entry.id;
  liElt.dataset["dndText"] = data.entries.getPathFromId(entry.id);
  let parentEntry = data.entries.parentNodesById[entry.id];
  if (parentEntry != null) liElt.dataset["parentId"] = parentEntry.id;

  if (entry.type != null) {
    let iconElt = document.createElement("img");
    iconElt.draggable = false;
    iconElt.src = `/systems/${data.systemName}/plugins/${data.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
    liElt.appendChild(iconElt);
  }

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = entry.name;
  liElt.appendChild(nameSpan);

  if (entry.type != null) {
    liElt.addEventListener("mouseenter", (event) => { liElt.appendChild(ui.openInNewWindowButton); });
    liElt.addEventListener("mouseleave", (event) => {
      if (ui.openInNewWindowButton.parentElement != null) ui.openInNewWindowButton.parentElement.removeChild(ui.openInNewWindowButton);
    });

    let badgesSpan = document.createElement("span");
    badgesSpan.className = "badges";

    for (let badge of entry.badges) {
      let badgeSpan = document.createElement("span");
      badgeSpan.className = badge.id;
      badgeSpan.textContent = badge.id;
      badgesSpan.appendChild(badgeSpan);
    }
    liElt.appendChild(badgesSpan);
  } else {
    let childrenElt = document.createElement("span");
    childrenElt.className = "children";
    childrenElt.textContent = `(${entry.children.length})`;
    liElt.appendChild(childrenElt);
    childrenElt.style.display = "none";

    liElt.addEventListener("mouseenter", (event) => { childrenElt.style.display = ""; });
    liElt.addEventListener("mouseleave", (event) => { childrenElt.style.display = "none"; });
  }
  return liElt;
}

function onEntryDrop(dropInfo: any, orderedNodes: any) {
  let dropPoint = SupClient.getTreeViewDropPoint(dropInfo, data.entries);

  let entryIds: string[] = [];
  for (let entry of orderedNodes) entryIds.push(entry.dataset.id);

  let sourceParentNode = data.entries.parentNodesById[entryIds[0]];
  let sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.entries.pub;
  let sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (let id of entryIds) {
    socket.emit("move:entries", id, dropPoint.parentId, dropPoint.index + i, (err: string) => { if (err != null) alert(err); });
    if (!sameParent || sourceChildren.indexOf(data.entries.byId[id]) >= dropPoint.index) i++;
  }
  return false;
}

function updateSelectedEntry() {
  let allButtons = document.querySelectorAll(".entries-buttons button.edit");
  for (let index = 0; index < allButtons.length; index++) {
    let button = <HTMLButtonElement>allButtons.item(index);
    let disabled = (ui.entriesTreeView.selectedNodes.length === 0 ||
      (button.classList.contains("single") && ui.entriesTreeView.selectedNodes.length !== 1) ||
      (button.classList.contains("asset-only") && ui.entriesTreeView.selectedNodes[0].classList.contains("group")));

    button.disabled = disabled;
  }
}

function onEntryActivate() {
  let activatedEntry = ui.entriesTreeView.selectedNodes[0];
  openEntry(activatedEntry.dataset.id);
}

function onMessage(event: any) {
  switch(event.data.type) {
    case "chat": onMessageChat(event.data.content); break;
    case "hotkey": onMessageHotKey(event.data.content); break;
    case "openEntry": openEntry(event.data.id, event.data.options); break;
    case "openTool": openTool(event.data.name, event.data.options); break;
    case "error": onWindowDevError(); break;
  }
}

function onWindowDevError() {
  let projectManagementDiv = <HTMLDivElement>document.querySelector(".project-management");
  projectManagementDiv.style.backgroundColor = "#c42";
  return false;
}

function onMessageChat(message: string) {
  let isHomeTabVisible = ui.homeTab.classList.contains("active");
  if (isHomeTabVisible && !document.hidden) return;

  if (!isHomeTabVisible) ui.homeTab.classList.add("blink");

  if (localStorage.getItem("superpowers-disable-notifications") != null) return;

  function doNotification() {
    let notification = new (<any>window).Notification(`New chat message in "${data.manifest.pub.name}" project`,
      { icon: "/images/icon.png", body: message });

    let closeTimeoutId = setTimeout(() => { notification.close(); }, 5000);

    notification.addEventListener("click", () => {
      window.focus();
      onTabActivate(ui.homeTab);
      clearTimeout(closeTimeoutId);
      notification.close();
    });
  }

  if ((<any>window).Notification.permission === "granted") doNotification();
  else if ((<any>window).Notification.permission !== "denied") {
    (<any>window).Notification.requestPermission((status: string) => {
      (<any>window).Notification.permission = status;
      if ((<any>window).Notification.permission === "granted") doNotification();
    });
  }
}

function onMessageHotKey(action: string) {
  switch (action) {
    case "newAsset":     onNewAssetClick(); break;
    case "newFolder":    onNewFolderClick(); break;
    case "searchEntry":  onSearchEntryDialog(); break;
    case "closeTab":     onTabClose(ui.tabStrip.tabsRoot.querySelector(".active")); break;
    case "previousTab":  onActivatePreviousTab(); break;
    case "nextTab":      onActivateNextTab(); break;
    case "run":          runProject(); break;
    case "debug":        runProject({ debug: true }); break;
    case "devtools":     showDevTools(); break;
  }
}

function onClickToggleNotifications(event: any) {
  let disableNotifications = (localStorage.getItem("superpowers-disable-notifications") != null) ? true : false;
  disableNotifications = !disableNotifications;

  if (!disableNotifications) {
    localStorage.removeItem("superpowers-disable-notifications");
    event.target.classList.remove("disabled");
    event.target.title = "Click to disable notifications";
  } else {
    localStorage.setItem("superpowers-disable-notifications", "true");
    event.target.classList.add("disabled");
    event.target.title = "Click to enable notifications";
  }
}

function onSearchEntryDialog() {
  if (data == null) return;

  /* tslint:disable:no-unused-expression */
  new FindAssetDialog(data.entries, data.editorsByAssetType, (entryId) => {
    /* tslint:enable:no-unused-expression */
    if (entryId == null) return;
    openEntry(entryId);
  });
}

function openEntry(id: string, optionValues?: {[name: string]: any}) {
  let entry = data.entries.byId[id];

  // Just toggle folders
  if (entry.type == null) { ui.entriesTreeView.selectedNodes[0].classList.toggle("collapsed"); return; }

  let tab = ui.tabStrip.tabsRoot.querySelector(`li[data-asset-id='${id}']`);
  let iframe = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-asset-id='${id}']`);

  if (tab == null) {
    tab = createAssetTabElement(entry);
    ui.tabStrip.tabsRoot.appendChild(tab);

    iframe = document.createElement("iframe");
    let options = "";
    if (optionValues != null)
      for (let optionName in optionValues) options += `&${optionName}=${optionValues[optionName]}`;
    iframe.src = `/systems/${data.systemName}/plugins/${data.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/?project=${SupClient.query.project}&asset=${id}${options}`;
    iframe.dataset["assetId"] = id;
    ui.panesElt.appendChild(iframe);
  } else if (optionValues != null) {
    let origin: string = (<any>window.location).origin;
    iframe.contentWindow.postMessage(optionValues, origin);
  }
  onTabActivate(tab);
}

function openTool(name: string, optionValues?: {[name: string]: any}) {
  let tab = ui.tabStrip.tabsRoot.querySelector(`li[data-pane='${name}']`);
  let iframe = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-name='${name}']`);

  if (tab == null) {
    let tool = data.toolsByName[name];
    tab = createToolTabElement(name, tool);
    ui.tabStrip.tabsRoot.appendChild(tab);

    iframe = document.createElement("iframe");

    let options = "";
    if (optionValues != null)
      for (let optionName in optionValues) options += `&${optionName}=${optionValues[optionName]}`;
    iframe.src = `/systems/${data.systemName}/plugins/${tool.pluginPath}/editors/${name}/?project=${SupClient.query.project}${options}`;
    iframe.dataset["name"] = name;
    ui.panesElt.appendChild(iframe);
  } else if (optionValues != null) {
    let origin: string = (<any>window.location).origin;
    iframe.contentWindow.postMessage(optionValues, origin);
  }

  onTabActivate(tab);
  return tab;
}

function onNewAssetClick() {
  /* tslint:disable:no-unused-expression */
  new CreateAssetDialog(data.assetTypesByTitle, autoOpenAsset, (name, type, open) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;
    if (name === "") name = data.editorsByAssetType[type].title;

    autoOpenAsset = open;
    socket.emit("add:entries", name, type, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function onNewFolderClick() {
  let options = {
    placeholder: "Enter a name",
    initialValue: "Folder",
    validationLabel: "Create",
    pattern: SupClient.namePattern,
    title: SupClient.namePatternDescription
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog("Enter a name for the new folder.", options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;

    socket.emit("add:entries", name, null, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function onTrashEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length === 0) return;

  let selectedEntries: SupCore.Data.EntryNode[] = [];

  function checkNextEntry() {
    selectedEntries.splice(0, 1);
    if (selectedEntries.length === 0) {
      /* tslint:disable:no-unused-expression */
      new SupClient.dialogs.ConfirmDialog("Are you sure you want to trash the selected entries?", "Trash", (confirm) => {
        /* tslint:enable:no-unused-expression */
        if (!confirm) return;

        function trashEntry(entry: SupCore.Data.EntryNode) {
          if (entry.type == null) for (let entryChild of entry.children) trashEntry(entryChild);

          socket.emit("trash:entries", entry.id, (err: string) => {
            if (err != null) { alert(err); return; }
          });
        }

        for (let selectedNode of ui.entriesTreeView.selectedNodes) {
          let entry = data.entries.byId[selectedNode.dataset.id];
          trashEntry(entry);
        }
        ui.entriesTreeView.clearSelection();
      });

    } else warnBrokenDependency(selectedEntries[0]);
  }

  function warnBrokenDependency(entry: SupCore.Data.EntryNode) {
    if (entry.type == null) for (let entryChild of entry.children) selectedEntries.push(entryChild);

    if (entry.dependentAssetIds != null && entry.dependentAssetIds.length > 0) {
      let dependentAssetNames: string[] = [];
      for (let usingId of entry.dependentAssetIds) dependentAssetNames.push(data.entries.byId[usingId].name);
      /* tslint:disable:no-unused-expression */
      new SupClient.dialogs.InfoDialog(`${entry.name} is used in ${dependentAssetNames.join(", ")}.`, "Close", () => { checkNextEntry(); });
      /* tslint:enable:no-unused-expression */
    } else checkNextEntry();
  }

  for (let selectedNode of ui.entriesTreeView.selectedNodes) selectedEntries.push(data.entries.byId[selectedNode.dataset.id]);
  warnBrokenDependency(selectedEntries[0]);
}

function onOpenInNewWindowClick(event: any) {
  let id = event.target.parentElement.dataset.id;
  if (id != null) {
    let entry = data.entries.byId[id];
    let address = `${window.location.origin}/systems/${data.systemName}` +
    `/plugins/${data.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/` +
    `?project=${SupClient.query.project}&asset=${entry.id}`;
    if (SupClient.isApp) electron.ipcRenderer.send("new-standalone-window", address);
    else window.open(address);
  } else {
    let name = event.target.parentElement.dataset.name;
    let address = `${window.location.origin}/systems/${data.systemName}` +
    `/plugins/${data.toolsByName[name].pluginPath}/editors/${name}/` +
    `?project=${SupClient.query.project}`;
    if (SupClient.isApp) electron.ipcRenderer.send("new-standalone-window", address);
    else window.open(address);
  }
}

function onRenameEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.entriesTreeView.selectedNodes[0];
  let entry = data.entries.byId[selectedNode.dataset.id];

  let options = {
    initialValue: entry.name,
    validationLabel: "Rename",
    pattern: SupClient.namePattern,
    title: SupClient.namePatternDescription
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog("Enter a new name for the asset.", options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null || newName === entry.name) return;

    socket.emit("setProperty:entries", entry.id, "name", newName, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}

function onDuplicateEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.entriesTreeView.selectedNodes[0];
  let entry = data.entries.byId[selectedNode.dataset.id];
  if (entry.type == null) return;

  let options = {
    initialValue: entry.name,
    validationLabel: "Duplicate",
    pattern: SupClient.namePattern,
    title: SupClient.namePatternDescription
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog("Enter a name for the new asset.", options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;

    socket.emit("duplicate:entries", newName, entry.id, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function refreshAssetTabElement(entry: SupCore.Data.EntryNode, tabElt?: HTMLLIElement) {
  if (tabElt == null) tabElt = ui.tabStrip.tabsRoot.querySelector(`[data-asset-id='${entry.id}']`);
  if (tabElt == null) return;

  let entryPath = data.entries.getPathFromId(entry.id);
  let entryLocation = "";
  let entryName = entry.name;

  let lastSlash = entryPath.lastIndexOf("/");
  if (lastSlash !== -1) entryLocation = entryPath.slice(0, lastSlash);

  const maxEntryLocationLength = 20;
  while (entryLocation.length > maxEntryLocationLength) {
    let slashIndex = entryLocation.indexOf("/", 2);
    if (slashIndex === -1) break;
    entryLocation = `…/${entryLocation.slice(slashIndex + 1)}`;
  }

  tabElt.querySelector(".label .location").textContent = entryLocation;
  tabElt.querySelector(".label .name").textContent = entryName;
  tabElt.title = entryPath;
}

function createAssetTabElement(entry: SupCore.Data.EntryNode) {
  let tabElt = document.createElement("li");

  if (entry.type != null) {
    let iconElt = document.createElement("img");
    iconElt.classList.add("icon");
    iconElt.src = `/systems/${data.systemName}/plugins/${data.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
    tabElt.appendChild(iconElt);
  }

  let tabLabel = document.createElement("div");
  tabLabel.classList.add("label");
  tabElt.appendChild(tabLabel);

  let tabLabelLocation = document.createElement("div");
  tabLabelLocation.classList.add("location");
  tabLabel.appendChild(tabLabelLocation);

  let tabLabelName = document.createElement("div");
  tabLabelName.classList.add("name");
  tabLabel.appendChild(tabLabelName);

  let closeButton = document.createElement("button");
  closeButton.classList.add("close");
  closeButton.addEventListener("click", () => { onTabClose(tabElt); });
  tabElt.appendChild(closeButton);

  tabElt.dataset["assetId"] = entry.id;

  refreshAssetTabElement(entry, tabElt);

  return tabElt;
}

function createToolTabElement(toolName: string, tool: EditorManifest) {
  let tabElt = document.createElement("li");

  let iconElt = document.createElement("img");
  iconElt.classList.add("icon");
  iconElt.src = `/systems/${data.systemName}/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg`;
  tabElt.appendChild(iconElt);

  if (!tool.pinned) {
    let tabLabel = document.createElement("div");
    tabLabel.classList.add("label");
    tabElt.appendChild(tabLabel);

    let tabLabelName = document.createElement("div");
    tabLabelName.classList.add("name");
    tabLabel.appendChild(tabLabelName);
    tabLabelName.textContent = tool.title;

    let closeButton = document.createElement("button");
    closeButton.classList.add("close");
    closeButton.addEventListener("click", () => { onTabClose(tabElt); });
    tabElt.appendChild(closeButton);
  } else {
    tabElt.classList.add("pinned");
  }

  tabElt.dataset["pane"] = toolName;
  return tabElt;
}

function onTabActivate(tabElement: any) {
  let activeTab = ui.tabStrip.tabsRoot.querySelector(".active");
  if (activeTab != null) {
    activeTab.classList.remove("active");

    let activeIframe = (<HTMLIFrameElement>ui.panesElt.querySelector("iframe.active"));
    activeIframe.contentWindow.postMessage({ type: "deactivate" }, (<any>window.location).origin);
    activeIframe.classList.remove("active");
  }

  tabElement.classList.add("active");
  tabElement.classList.remove("blink");

  let assetId = tabElement.dataset["assetId"];
  let tabIframe: HTMLIFrameElement;
  if (assetId != null) tabIframe = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-asset-id='${assetId}']`);
  else tabIframe = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-name='${tabElement.dataset.pane}']`);

  tabIframe.classList.add("active");
  tabIframe.contentWindow.focus();
  tabIframe.contentWindow.postMessage({ type: "activate" }, (<any>window.location).origin);
}

function onTabClose(tabElement: HTMLLIElement) {
  let assetId = tabElement.dataset["assetId"];
  let frameElt: HTMLIFrameElement;
  if (assetId != null) frameElt = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-asset-id='${assetId}']`);
  else {
    let toolName = tabElement.dataset["pane"];
    if (toolName === "main") return;

    frameElt = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-name='${toolName}']`);
  }

  if (tabElement.classList.contains("active")) {
    let activeTabElement = (tabElement.nextSibling != null) ? tabElement.nextSibling : tabElement.previousSibling;
    if (activeTabElement != null) onTabActivate(activeTabElement);
  }

  tabElement.parentElement.removeChild(tabElement);
  frameElt.parentElement.removeChild(frameElt);
}

function onActivatePreviousTab() {
  let activeTabElt = ui.tabStrip.tabsRoot.querySelector(".active");
  for (let tabIndex = 0; ui.tabStrip.tabsRoot.children.length; tabIndex++) {
    let tabElt = ui.tabStrip.tabsRoot.children[tabIndex];
    if (tabElt === activeTabElt) {
      let newTabIndex = (tabIndex === 0) ? ui.tabStrip.tabsRoot.children.length - 1 : tabIndex - 1;
      onTabActivate(ui.tabStrip.tabsRoot.children[newTabIndex]);
      return;
    }
  }
}

function onActivateNextTab() {
  let activeTabElt = ui.tabStrip.tabsRoot.querySelector(".active");
  for (let tabIndex = 0; ui.tabStrip.tabsRoot.children.length; tabIndex++) {
    let tabElt = ui.tabStrip.tabsRoot.children[tabIndex];
    if (tabElt === activeTabElt) {
      let newTabIndex = (tabIndex === ui.tabStrip.tabsRoot.children.length - 1) ? 0 : tabIndex + 1;
      onTabActivate(ui.tabStrip.tabsRoot.children[newTabIndex]);
      return;
    }
  }
}
