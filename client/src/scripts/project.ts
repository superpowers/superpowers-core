import newAssetDialog from "../dialogs/newAsset";

let nodeRequire = require;
let TreeView = require("dnd-tree-view");
let PerfectResize = require("perfect-resize");
let TabStrip = require("tab-strip");

let info: { projectId?: string } = {};
let data: { config?: { buildPort: number; }; manifest?: SupCore.data.Manifest; entries?: SupCore.data.Entries; };
let ui: {
  entriesTreeView?: any;
  openInNewWindowButton?: HTMLButtonElement;
  tabStrip?: any;
  assetsTypeByName?: any;
  homeTab?: HTMLLIElement;
  panesElt?: HTMLDivElement;
} = {};
let socket: SocketIOClient.Socket;

export default function project(projectId: string) {
  info.projectId = projectId;

  let template = <any>document.getElementById("project-template");
  let clone = document.importNode(template.content, true);
  document.body.appendChild(clone);

  // Workaround for NW.js bug: https://github.com/nwjs/nw.js/issues/3360
  if (navigator.platform === "MacIntel") (<any>document.querySelector(".tabs-bar")).style.webkitAppRegion = "no-drag";

  // Development mode
  if (localStorage.getItem("superpowers-dev-mode") != null) {
    let projectManagementDiv = <HTMLDivElement>document.querySelector(".project .project-management");
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
  new PerfectResize(document.querySelector(".project .sidebar"), "left");

  // Project info
  document.querySelector(".project-buttons .run").addEventListener("click", () => { runGame(); });
  document.querySelector(".project-buttons .export").addEventListener("click", () => { exportGame(); });
  document.querySelector(".project-buttons .debug").addEventListener("click", () => { runGame({ debug: true }); });
  if ((<any>window).nwDispatcher == null) {
    (<HTMLButtonElement>document.querySelector(".project-buttons .export")).title = "Export game (only works from the Superpowers app for technical reasons)";
    (<HTMLButtonElement>document.querySelector(".project-buttons .debug")).style.display = "none";
  }

  // Entries tree view
  ui.entriesTreeView = new TreeView(document.querySelector(".entries-tree-view"), onEntryDrop);
  ui.entriesTreeView.on("selectionChange", updateSelectedEntry);
  ui.entriesTreeView.on("activate", onEntryActivate);

  ui.assetsTypeByName = {};
  for (let assetType in SupClient.pluginPaths.editorsByAssetType) {
    let editor = SupClient.pluginPaths.editorsByAssetType[assetType];
    ui.assetsTypeByName[editor.title.en] = assetType;
  }

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

  // Panes
  ui.panesElt = <HTMLDivElement>document.querySelector(".project .main .panes");

  window.addEventListener("message", onMessage);

  // Tools and settings
  let toolsList = document.querySelector(".sidebar .tools ul");

  for (let toolName in SupClient.pluginPaths.toolsByName) {
    let tool = SupClient.pluginPaths.toolsByName[toolName];
    if (toolName === "main" && tool.pluginPath === "sparklinlabs/home") {
      ui.homeTab = openTool(toolName);
      continue;
    }

    let toolElt = document.createElement("li");
    (<any>toolElt.dataset).name = toolName;
    let containerElt = document.createElement("div");
    toolElt.appendChild(containerElt);

    let iconElt = document.createElement("img");
    iconElt.src = `/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg`;
    containerElt.appendChild(iconElt);

    let nameSpanElt = document.createElement("span");
    nameSpanElt.className = "name";
    nameSpanElt.textContent = tool.title.en;
    containerElt.appendChild(nameSpanElt);

    toolElt.addEventListener("mouseenter", (event: any) => { event.target.appendChild(ui.openInNewWindowButton); });
    toolElt.addEventListener("mouseleave", (event) => {
      if (ui.openInNewWindowButton.parentElement != null) ui.openInNewWindowButton.parentElement.removeChild(ui.openInNewWindowButton);
    });
    nameSpanElt.addEventListener("click", (event: any) => { openTool(event.target.parentElement.parentElement.dataset.name); });
    toolsList.appendChild(toolElt);
  }

  // Network
  socket = SupClient.connect(projectId, { promptCredentials: true, reconnection: true });

  socket.on("connect", onConnected);
  socket.on("disconnect", onDisconnected);

  socket.on("welcome", onWelcome);
  socket.on("setProperty:manifest", onSetManifestProperty);

  socket.on("add:entries", onEntryAdded);
  socket.on("move:entries", onEntryMoved);
  socket.on("trash:entries", onEntryTrashed);
  socket.on("setProperty:entries", onSetEntryProperty);

  socket.on("set:diagnostics", onDiagnosticSet);
  socket.on("clear:diagnostics", onDiagnosticCleared);

  socket.on("add:dependencies", onDependenciesAdded);
  socket.on("remove:dependencies", onDependenciesRemoved);
}

// Network callbacks
function onConnected() {
  data = {};
  socket.emit("sub", "manifest", null, onManifestReceived);
  socket.emit("sub", "entries", null, onEntriesReceived);
}

function onDisconnected() {
  data = null;
  ui.entriesTreeView.clearSelection();
  ui.entriesTreeView.treeRoot.innerHTML = "";
  updateSelectedEntry();

  (<HTMLButtonElement>document.querySelector(".project-buttons .run")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".project-buttons .debug")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".project-buttons .export")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-asset")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-folder")).disabled = true;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .search")).disabled = true;
  (<HTMLDivElement>document.querySelector(".connecting")).style.display = "";
}

function onWelcome(clientId: number, config: { buildPort: number }) {
  data.config = config;
}

function onManifestReceived(err: string, manifest: any) {
  data.manifest = new SupCore.data.Manifest(manifest);

  document.querySelector(".project .project-name").textContent = manifest.name;
  document.title = `${manifest.name} — Superpowers`;
}

function onEntriesReceived(err: string, entries: SupCore.data.EntryNode[]) {
  data.entries = new SupCore.data.Entries(entries);

  ui.entriesTreeView.clearSelection();
  ui.entriesTreeView.treeRoot.innerHTML = "";

  (<HTMLDivElement>document.querySelector(".connecting")).style.display = "none";

  if ((<any>window).nwDispatcher != null) (<HTMLButtonElement>document.querySelector(".project-buttons .export")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".project-buttons .run")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".project-buttons .debug")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-asset")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .new-folder")).disabled = false;
  (<HTMLButtonElement>document.querySelector(".entries-buttons .search")).disabled = false;

  function walk(entry: SupCore.data.EntryNode, parentEntry: SupCore.data.EntryNode, parentElt: HTMLLIElement) {
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
      document.querySelector(".project .project-name").textContent = value;
      break;
  }
}

function onEntryAdded(entry: SupCore.data.EntryNode, parentId: string, index: number) {
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

  let oldParentId: string = (<any>entryElt.dataset).parentId;
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
  if (parentId != null) (<any>entryElt.dataset).parentId = parentId;
  else delete (<any>entryElt.dataset).parentId;

  updateEntryElementPath(id);
  refreshAssetTabElement(data.entries.byId[id]);
}

function updateEntryElementPath(id: string) {
  let entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  (<any>entryElt.dataset).dndText = data.entries.getPathFromId(id);

  let node = data.entries.byId[id];
  if (node.children != null) {
    for (let child of node.children) updateEntryElementPath(child.id);
  }
}

function onEntryTrashed(id: string) {
  data.entries.client_remove(id);

  let entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  let oldParentId: string = (<any>entryElt.dataset).parentId;
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
      refreshAssetTabElement(data.entries.byId[id]);
      break;
  }
}

function onDiagnosticSet(id: string, newDiag: any) {
  let diagnostics = data.entries.diagnosticsByEntryId[id];

  let existingDiag = diagnostics.byId[newDiag.id];
  if (existingDiag != null) {
    existingDiag.type = newDiag.type;
    existingDiag.data = newDiag.data;
  } else diagnostics.client_add(newDiag, null);

  let diagnosticsElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}'] .diagnostics`);
  let diagSpan = document.createElement("span");
  diagSpan.className = newDiag.id;
  diagSpan.textContent = newDiag.id;
  diagnosticsElt.appendChild(diagSpan);
}

function onDiagnosticCleared(id: string, diagId: string) {
  let diagnostics = data.entries.diagnosticsByEntryId[id];
  diagnostics.client_remove(diagId);

  let diagElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}'] .diagnostics .${diagId}`);
  diagElt.parentElement.removeChild(diagElt);
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
// Make sure windows have a frame in NW.js
let nwDispatcher = (<any>window).nwDispatcher;
if (nwDispatcher != null) {
  let gui = nwDispatcher.requireNwGui();
  let nwWindow = gui.Window.get();
  nwWindow.on("new-win-policy", (frame: any, url: string, policy: any) => {
    let options = {
      min_width: 800, min_height: 480,
      width: 1000, height: 600,
      toolbar: false, frame: true, focus: true
    };

    if (url.substring(0, "data:".length) === "data:") {
      options.width = 800;
      options.height = 480;
    }

    policy.setNewWindowManifest(options);
  });
}

let gameWindow: any;
function runGame(options: { debug: boolean; } = { debug: false }) {
  if (nwDispatcher != null && gameWindow != null) gameWindow.close();
  gameWindow = window.open("build.html", `player_${info.projectId}`);

  socket.emit("build:project", (err: string, buildId: string) => {
    if (err != null) { alert(err); return; }

    let url = `${window.location.protocol}//${window.location.hostname}:${data.config.buildPort}/player?project=${info.projectId}&build=${buildId}`;
    if (options.debug) url += "&debug";

    window.open(url, `player_${info.projectId}`);
  });
}

function exportGame() {
  let fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.setAttribute("nwdirectory", "");
  fileInput.setAttribute("nwsaveas", "");
  fileInput.click();

  fileInput.addEventListener("change", function(event) {
    let outputFolder = this.value;
    let isFolderEmpty = false;

    let fs = nodeRequire("fs");
    try { isFolderEmpty = fs.readdirSync(outputFolder).length === 0; }
    catch (e) { alert(`Error while checking if folder was empty: ${e.message}`); return; }
    if (! isFolderEmpty) { alert("Output folder must be empty."); return; }

    let playerWindow = window.open("build.html", "player");

    let doExport = () => {
      playerWindow.removeEventListener("load", doExport);

      socket.emit("build:project", (err: string, buildId: string, files: any) => {
        playerWindow.postMessage({ type: "save", projectId: info.projectId, buildId, buildPort: data.config.buildPort, outputFolder, files }, (<any>window.location).origin);
      });
    };

    playerWindow.addEventListener("load", doExport);
  });
}

function showDevTools() {
  if (nwDispatcher != null) nwDispatcher.requireNwGui().Window.get().showDevTools();
}

function createEntryElement(entry: any) {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).id = entry.id;
  (<any>liElt.dataset).dndText = data.entries.getPathFromId(entry.id);
  let parentEntry = data.entries.parentNodesById[entry.id];
  if (parentEntry != null) (<any>liElt.dataset).parentId = parentEntry.id;

  if (entry.type != null) {
    let iconElt = document.createElement("img");
    iconElt.src = `/plugins/${SupClient.pluginPaths.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
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

    let diagnosticsSpan = document.createElement("span");
    diagnosticsSpan.className = "diagnostics";

    for (let diag of entry.diagnostics) {
      let diagSpan = document.createElement("span");
      diagSpan.className = diag.id;
      diagSpan.textContent = diag.id;
      diagnosticsSpan.appendChild(diagSpan);
    }
    liElt.appendChild(diagnosticsSpan);
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
  let projectManagementDiv = <HTMLDivElement>document.querySelector(".project .project-management");
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
    case "run":          runGame(); break;
    case "debug":        runGame({ debug: true }); break;
    case "devtools":     showDevTools(); break;
  }
}

function onClickToggleNotifications(event: any) {
  let disableNotifications = (localStorage.getItem("superpowers-disable-notifications") != null) ? true : false;
  disableNotifications = !disableNotifications;

  if (! disableNotifications) {
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

  let entries: string[] = [];
  data.entries.walk((node: SupCore.data.EntryNode) => {
    if (node.type != null) entries.push(data.entries.getPathFromId(node.id));
  });

  SupClient.dialogs.filter(entries, "Asset Name", (entryPath) => {
    if (entryPath == null) return;
    openEntry(SupClient.findEntryByPath(data.entries.pub, entryPath).id);
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
    iframe.src = `/plugins/${SupClient.pluginPaths.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/?project=${info.projectId}&asset=${id}${options}`;
    (<any>iframe.dataset).assetId = id;
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
    let tool = SupClient.pluginPaths.toolsByName[name];
    tab = createToolTabElement(name, tool);
    ui.tabStrip.tabsRoot.appendChild(tab);

    iframe = document.createElement("iframe");
    let options = "";
    if (optionValues != null)
      for (let optionName in optionValues) options += `&${optionName}=${optionValues[optionName]}`;
    iframe.src = `/plugins/${tool.pluginPath}/editors/${name}/?project=${info.projectId}${options}`;
    (<any>iframe.dataset).name = name;
    ui.panesElt.appendChild(iframe);
  } else if (optionValues != null) {
    let origin: string = (<any>window.location).origin;
    iframe.contentWindow.postMessage(optionValues, origin);
  }

  onTabActivate(tab);
  return tab;
}

function onNewAssetClick() {
  newAssetDialog(ui.assetsTypeByName, autoOpenAsset, (name, type, open) => {
    if (name == null) return;
    if (name === "") name = SupClient.pluginPaths.editorsByAssetType[type].title.en;

    autoOpenAsset = open;
    socket.emit("add:entries", name, type, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function onNewFolderClick() {
  SupClient.dialogs.prompt("Enter a name for the new folder.", "Enter a name", "Folder", "Create", { pattern: "[^/]+", title: "Must contain no slashes." }, (name) => {
    if (name == null) return;

    socket.emit("add:entries", name, null, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function onTrashEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length === 0) return;

  let selectedEntries: SupCore.data.EntryNode[] = [];

  function checkNextEntry() {
    selectedEntries.splice(0, 1);
    if (selectedEntries.length === 0) {
      SupClient.dialogs.confirm("Are you sure you want to trash the selected entries?", "Trash", (confirm) => {
        if (! confirm) return;

        function trashEntry(entry: SupCore.data.EntryNode) {
          if (entry.type == null) for (let entryChild of entry.children) trashEntry(entryChild);

          socket.emit("trash:entries", entry.id, (err: string) => {
            if (err != null) alert(err);
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

  function warnBrokenDependency(entry: SupCore.data.EntryNode) {
    if (entry.type == null) for (let entryChild of entry.children) selectedEntries.push(entryChild);

    if (entry.dependentAssetIds != null && entry.dependentAssetIds.length > 0) {
      let dependentAssetNames: string[] = [];
      for (let usingId of entry.dependentAssetIds) dependentAssetNames.push(data.entries.byId[usingId].name);
      SupClient.dialogs.info(`${entry.name} is used in ${dependentAssetNames.join(", ")}.`, "Close", () => { checkNextEntry(); });
    } else checkNextEntry();
  }

  for (let selectedNode of ui.entriesTreeView.selectedNodes) selectedEntries.push(data.entries.byId[selectedNode.dataset.id]);
  warnBrokenDependency(selectedEntries[0]);
}

function onOpenInNewWindowClick(event: any) {
  let id = event.target.parentElement.dataset.id;
  if (id != null) {
    let entry = data.entries.byId[id];
    window.open(`${(<any>window.location).origin}/plugins/${SupClient.pluginPaths.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/?project=${info.projectId}&asset=${entry.id}`);
  } else {
    let name = event.target.parentElement.dataset.name;
    let tool = SupClient.pluginPaths.toolsByName[name];
    window.open(`${(<any>window.location).origin}/plugins/${SupClient.pluginPaths.toolsByName[name].pluginPath}/editors/${name}/?project=${info.projectId}`);
  }
}

function onRenameEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.entriesTreeView.selectedNodes[0];
  let entry = data.entries.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the asset.", null, entry.name, "Rename", { pattern: "[^/]+", title: "Must contain no slashes." }, (newName) => {
    if (newName == null || newName === entry.name) return;

    socket.emit("setProperty:entries", entry.id, "name", newName, (err: string) => {
      if (err != null) alert(err);
    });
  });
}

function onDuplicateEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.entriesTreeView.selectedNodes[0];
  let entry = data.entries.byId[selectedNode.dataset.id];
  if (entry.type == null) return;

  SupClient.dialogs.prompt("Enter a name for the new asset.", null, entry.name, "Duplicate", (newName) => {
    if (newName == null) return;

    socket.emit("duplicate:entries", newName, entry.id, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function refreshAssetTabElement(entry: SupCore.data.EntryNode) {
  let tabElt = ui.tabStrip.tabsRoot.querySelector(`[data-asset-id='${entry.id}']`);
  if (tabElt == null) return;

  tabElt.querySelector(".label").textContent = entry.name;
  tabElt.title = data.entries.getPathFromId(entry.id);
}

function createAssetTabElement(entry: SupCore.data.EntryNode) {
  let tabElt = document.createElement("li");

  if (entry.type != null) {
    let iconElt = document.createElement("img");
    iconElt.classList.add("icon");
    iconElt.src = `/plugins/${SupClient.pluginPaths.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`
    tabElt.appendChild(iconElt);
  }

  let tabLabel = document.createElement("span");
  tabLabel.classList.add("label");
  tabLabel.textContent = entry.name;
  tabElt.appendChild(tabLabel);

  let closeButton = document.createElement("button");
  closeButton.classList.add("close");
  closeButton.addEventListener("click", () => { onTabClose(tabElt); });
  tabElt.appendChild(closeButton);

  tabElt.title = data.entries.getPathFromId(entry.id);
  (<any>tabElt.dataset).assetId = entry.id;
  return tabElt;
}

function createToolTabElement(toolName: string, tool: any) {
  let tabElt = document.createElement("li");

  let iconElt = document.createElement("img");
  iconElt.classList.add("icon");
  iconElt.src = `/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg`;
  tabElt.appendChild(iconElt);

  let tabLabel = document.createElement("span");
  tabLabel.classList.add("label");
  tabElt.appendChild(tabLabel);

  if (toolName !== "main") {
    tabLabel.textContent = tool.title.en;

    let closeButton = document.createElement("button");
    closeButton.classList.add("close");
    closeButton.addEventListener("click", () => { onTabClose(tabElt); });
    tabElt.appendChild(closeButton);
  }
  (<any>tabElt.dataset).pane = toolName;
  return tabElt;
}

function onTabActivate(tabElement: any) {
  let activeTab = ui.tabStrip.tabsRoot.querySelector(".active");
  if (activeTab != null) {
    activeTab.classList.remove("active");
    (<HTMLIFrameElement>ui.panesElt.querySelector("iframe.active")).classList.remove("active");
  }

  tabElement.classList.add("active");
  tabElement.classList.remove("blink");

  let assetId = (<any>tabElement.dataset).assetId;
  let tabIframe: HTMLIFrameElement;
  if (assetId != null) tabIframe = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-asset-id='${assetId}']`);
  else tabIframe = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-name='${tabElement.dataset.pane}']`);

  tabIframe.classList.add("active");
  tabIframe.contentWindow.focus();
  tabIframe.contentWindow.postMessage({ type: "activate" }, (<any>window.location).origin);
}

function onTabClose(tabElement: HTMLLIElement) {
  let assetId = (<any>tabElement.dataset).assetId;
  let frameElt: HTMLIFrameElement;
  if (assetId != null) frameElt = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-asset-id='${assetId}']`);
  else {
    let toolName = (<any>tabElement.dataset).pane;
    if (toolName == "main") return;

    frameElt = <HTMLIFrameElement>ui.panesElt.querySelector(`iframe[data-name='${toolName}']`);
  }

  if (tabElement.classList.contains("active")) {
    let activeTabElement = (tabElement.nextSibling != null) ? tabElement.nextSibling : tabElement.previousSibling;
    onTabActivate(activeTabElement);
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
