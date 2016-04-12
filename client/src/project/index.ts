import CreateAssetDialog from "./CreateAssetDialog";
import * as async from "async";

import * as TreeView from "dnd-tree-view";
import * as ResizeHandle from "resize-handle";
import * as TabStrip from "tab-strip";

let socket: SocketIOClient.Socket;

interface EditorManifest {
  title: string;
  // assetType: string; <- for asset editors, soon
  pinned?: boolean;
  pluginPath: string;
}

let buildPort: number;
let manifest: SupCore.Data.ProjectManifest;
let entries: SupCore.Data.Entries;

export let assetTypes: string[];
export let editorsByAssetType: { [assetType: string]: EditorManifest };
export let toolsByName: { [name: string]: EditorManifest };

const ui: {
  entriesTreeView?: TreeView;
  openInNewWindowButton?: HTMLButtonElement;
  tabStrip?: TabStrip;
  entriesFilterStrip?: HTMLElement;

  homeTab?: HTMLLIElement;
  panesElt?: HTMLDivElement;
  toolsElt?: HTMLUListElement;
} = {};

let runWindow: GitHubElectron.BrowserWindow;

if (SupApp != null) {
  window.addEventListener("beforeunload", () => {
    if (runWindow != null) runWindow.removeListener("closed", onCloseRunWindow);
  });
}

function start() {
  if (SupClient.query.project == null) goToHub();
  document.body.hidden = false;

  // Development mode
  if (localStorage.getItem("superpowers-dev-mode") != null) {
    const projectManagementDiv = document.querySelector(".project-management") as HTMLDivElement;
    projectManagementDiv.style.backgroundColor = "#37d";

    // According to http://stackoverflow.com/a/12747364/915914, window.onerror
    // should be used rather than window.addEventListener("error", ...);
    // to get all errors, including syntax errors.
    window.onerror = onWindowDevError;
  }

  // Hot-keys
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
  const sidebarResizeHandle = new ResizeHandle(document.querySelector(".sidebar") as HTMLElement, "left");
  if (SupClient.query.asset != null) {
    sidebarResizeHandle.handleElt.classList.add("collapsed");
    sidebarResizeHandle.targetElt.style.width = "0";
    sidebarResizeHandle.targetElt.style.display = "none";
  }

  // Project info
  document.querySelector(".project-icon .go-to-hub").addEventListener("click", () => { goToHub(); });
  document.querySelector(".project-buttons .run").addEventListener("click", () => { runProject(); });
  document.querySelector(".project-buttons .publish").addEventListener("click", () => { publishProject(); });
  document.querySelector(".project-buttons .debug").addEventListener("click", () => { runProject({ debug: true }); });
  document.querySelector(".project-buttons .stop").addEventListener("click", () => { stopProject(); });

  if (SupApp == null) {
    (document.querySelector(".project-buttons .publish") as HTMLButtonElement).title = SupClient.i18n.t("project:header.publishDisabled");
    (document.querySelector(".project-buttons .debug") as HTMLButtonElement).hidden = true;
    (document.querySelector(".project-buttons .stop") as HTMLButtonElement).hidden = true;
  }

  // Entries tree view
  ui.entriesTreeView = new TreeView(document.querySelector(".entries-tree-view") as HTMLElement, { dragStartCallback: onEntryDragStart, dropCallback: onTreeViewDrop });
  ui.entriesTreeView.on("selectionChange", updateSelectedEntry);
  ui.entriesTreeView.on("activate", onEntryActivate);

  ui.entriesFilterStrip = (document.querySelector(".filter-buttons") as HTMLElement);

  document.querySelector(".entries-buttons .new-asset").addEventListener("click", onNewAssetClick);
  document.querySelector(".entries-buttons .new-folder").addEventListener("click", onNewFolderClick);
  document.querySelector(".entries-buttons .search").addEventListener("click", onSearchEntryDialog);
  document.querySelector(".entries-buttons .rename-entry").addEventListener("click", onRenameEntryClick);
  document.querySelector(".entries-buttons .duplicate-entry").addEventListener("click", onDuplicateEntryClick);
  document.querySelector(".entries-buttons .trash-entry").addEventListener("click", onTrashEntryClick);
  document.querySelector(".entries-buttons .filter").addEventListener("click", onToggleFilterStripClick);

  ui.openInNewWindowButton = document.createElement("button");
  ui.openInNewWindowButton.className = "open-in-new-window";
  ui.openInNewWindowButton.title = SupClient.i18n.t("project:treeView.openInNewWindow");
  ui.openInNewWindowButton.addEventListener("click", onOpenInNewWindowClick);

  // Tab strip
  const tabsBarElt = document.querySelector(".tabs-bar") as HTMLElement;
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
  const toggleNotificationsButton = document.querySelector(".top .controls button.toggle-notifications") as HTMLButtonElement;
  toggleNotificationsButton.addEventListener("click", onClickToggleNotifications);

  if (localStorage.getItem("superpowers-disable-notifications") != null) {
    toggleNotificationsButton.classList.add("disabled");
    toggleNotificationsButton.title = SupClient.i18n.t("project:header.notifications.enable");
  } else {
    toggleNotificationsButton.classList.remove("disabled");
    toggleNotificationsButton.title = SupClient.i18n.t("project:header.notifications.disable");
  }

  // Panes and tools
  ui.panesElt = document.querySelector(".main .panes") as HTMLDivElement;
  ui.toolsElt = document.querySelector(".sidebar .tools ul") as HTMLUListElement;

  // Messaging
  window.addEventListener("message", onMessage);

  connect();
}

SupClient.i18n.load([{ root: "/", name: "project" }, { root: "/", name: "badges" }], start);

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

function loadPluginLocales(pluginsPaths: string[], cb: Function) {
  const localeFiles: SupClient.i18n.File[] = [];
  const pluginsRoot = `/systems/${SupCore.system.id}/plugins`;
  for (const pluginPath of pluginsPaths) {
    localeFiles.push({ root: `${pluginsRoot}/${pluginPath}`, name: "plugin", context: pluginPath });
    localeFiles.push({ root: `${pluginsRoot}/${pluginPath}`, name: "badges" });
  }

  SupClient.i18n.load(localeFiles, cb);
}

function setupAssetTypes(editorPaths: { [assetType: string]: string; }, callback: Function) {
  editorsByAssetType = {};
  for (const assetType in editorPaths) {
    editorsByAssetType[assetType] = {
      title: SupClient.i18n.t(`${editorPaths[assetType]}:editors.${assetType}.title`),
      pluginPath: editorPaths[assetType]
    };
  }

  assetTypes = Object.keys(editorPaths).sort((a, b) => editorsByAssetType[a].title.localeCompare(editorsByAssetType[b].title));
  callback();
}

function setupTools(toolPaths: { [name: string]: string; }, callback: Function) {
  toolsByName = {};

  const pluginsRoot = `/systems/${SupCore.system.id}/plugins`;

  async.each(Object.keys(toolPaths), (toolName, cb) => {
    const pluginPath = toolPaths[toolName];

    const toolTitle = SupClient.i18n.t(`${toolPaths[toolName]}:editors.${toolName}.title`);

    SupClient.fetch(`${pluginsRoot}/${pluginPath}/editors/${toolName}/manifest.json`, "json", (err: Error, toolManifest: EditorManifest) => {
      if (err != null) {
        toolsByName[toolName] = { pinned: false, pluginPath, title: toolTitle };
        cb();
        return;
      }

      toolsByName[toolName] = toolManifest;
      toolsByName[toolName].pluginPath = pluginPath;
      toolsByName[toolName].title = toolTitle;
      cb();
    });
  }, () => {
    ui.toolsElt.innerHTML = "";

    const toolNames = Object.keys(toolsByName);
    toolNames.sort((a, b) => toolsByName[a].title.localeCompare(toolsByName[b].title));

    for (const toolName of toolNames) setupTool(toolName);
    callback();
  });
}

function setupTool(toolName: string) {
  const tool = toolsByName[toolName];

  if (tool.pinned && SupClient.query.asset == null) {
    openTool(toolName);
    return;
  }

  const toolElt = document.createElement("li");
  toolElt.dataset["name"] = toolName;
  const containerElt = document.createElement("div");
  toolElt.appendChild(containerElt);

  const iconElt = document.createElement("img");
  iconElt.src = `/systems/${SupCore.system.id}/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg`;
  containerElt.appendChild(iconElt);

  const nameSpanElt = document.createElement("span");
  nameSpanElt.className = "name";
  nameSpanElt.textContent = SupClient.i18n.t(`${tool.pluginPath}:editors.${toolName}.title`);
  containerElt.appendChild(nameSpanElt);

  toolElt.addEventListener("mouseenter", (event: any) => { event.target.appendChild(ui.openInNewWindowButton); });
  toolElt.addEventListener("mouseleave", (event) => {
    if (ui.openInNewWindowButton.parentElement != null) ui.openInNewWindowButton.parentElement.removeChild(ui.openInNewWindowButton);
  });
  nameSpanElt.addEventListener("click", (event: any) => { openTool(event.target.parentElement.parentElement.dataset["name"]); });
  ui.toolsElt.appendChild(toolElt);
}

// Network callbacks
function onConnectionError() {
  const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.replace(`/login?redirect=${redirect}`);
}

function onDisconnected() {
  SupClient.Dialogs.cancelDialogIfAny();

  entries = null;
  ui.entriesTreeView.clearSelection();
  ui.entriesTreeView.treeRoot.innerHTML = "";
  updateSelectedEntry();

  (document.querySelector(".project-buttons .run") as HTMLButtonElement).disabled = true;
  (document.querySelector(".project-buttons .debug") as HTMLButtonElement).disabled = true;
  (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = true;
  (document.querySelector(".project-buttons .publish") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .new-asset") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .new-folder") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .search") as HTMLButtonElement).disabled = true;
  (document.querySelector(".filter-buttons") as HTMLDivElement).hidden = true;
  (document.querySelector(".connecting") as HTMLDivElement).hidden = false;
}

function onWelcome(clientId: number, config: { buildPort: number; }) {
  buildPort = config.buildPort;

  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    loadPluginLocales(pluginsInfo.list, () => {
      async.parallel([
        (cb: Function) => { setupAssetTypes(pluginsInfo.paths.editors, cb); },
        (cb: Function) => { setupTools(pluginsInfo.paths.tools, cb); }
      ], (err) => {
        if (err) throw err;
        socket.emit("sub", "manifest", null, onManifestReceived);
        socket.emit("sub", "entries", null, onEntriesReceived);
      });
    });
  });
}

function onManifestReceived(err: string, manifestPub: SupCore.Data.ProjectManifestPub) {
  manifest = new SupCore.Data.ProjectManifest(manifestPub);

  document.querySelector(".project-name").textContent = manifestPub.name;
  document.title = `${manifestPub.name} — Superpowers`;
}

function onEntriesReceived(err: string, entriesPub: SupCore.Data.EntryNode[]) {
  entries = new SupCore.Data.Entries(entriesPub);

  ui.entriesTreeView.clearSelection();
  ui.entriesTreeView.treeRoot.innerHTML = "";

  (document.querySelector(".connecting") as HTMLDivElement).hidden = true;

  if (SupApp != null) (<HTMLButtonElement>document.querySelector(".project-buttons .publish")).disabled = false;
  (document.querySelector(".project-buttons .run") as HTMLButtonElement).disabled = false;
  (document.querySelector(".project-buttons .debug") as HTMLButtonElement).disabled = false;
  (document.querySelector(".entries-buttons .new-asset") as HTMLButtonElement).disabled = false;
  (document.querySelector(".entries-buttons .new-folder") as HTMLButtonElement).disabled = false;
  (document.querySelector(".entries-buttons .search") as HTMLButtonElement).disabled = false;
  (document.querySelector(".entries-buttons .filter") as HTMLButtonElement).disabled = false;
  (document.querySelector(".filter-buttons") as HTMLButtonElement).hidden = true;

  function walk(entry: SupCore.Data.EntryNode, parentEntry: SupCore.Data.EntryNode, parentElt: HTMLLIElement) {
    const liElt = createEntryElement(entry);
    liElt.classList.add("collapsed");

    const nodeType = (entry.children != null) ? "group" : "item";
    ui.entriesTreeView.append(liElt, nodeType, parentElt);

    if (entry.children != null) for (const child of entry.children) walk(child, entry, liElt);
  }
  for (const entry of entriesPub) walk(entry, null, null);

  setupFilterStrip();

  if (SupClient.query.asset != null) openEntry(SupClient.query.asset);
}

function onSetManifestProperty(key: string, value: any) {
  manifest.client_setProperty(key, value);

  switch (key) {
    case "name":
      document.title = `${value} — Superpowers`;
      document.querySelector(".project-name").textContent = value;
      break;
  }
}

function onUpdateProjectIcon() {
  // TODO: Update favicon?
}

function onEntryAdded(entry: SupCore.Data.EntryNode, parentId: string, index: number) {
  entries.client_add(entry, parentId, index);

  const liElt = createEntryElement(entry);
  const nodeType = (entry.children != null) ? "group" : "item";

  let parentElt: HTMLLIElement;
  if (parentId != null) {
    parentElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[parentId];
    const childrenElt = parentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  ui.entriesTreeView.insertAt(liElt, nodeType, index, parentElt);
}

let autoOpenAsset = true;
function onEntryAddedAck(err: string, id: string) {
  if (err != null) {
    /* tslint:disable:no-unused-expression */
    new SupClient.Dialogs.InfoDialog(err);
    /* tslint:enable:no-unused-expression */
    return;
  }

  ui.entriesTreeView.clearSelection();
  let entry = ui.entriesTreeView.treeRoot.querySelector(`li[data-id='${id}']`) as HTMLLIElement;
  ui.entriesTreeView.addToSelection(entry);
  updateSelectedEntry();

  if (autoOpenAsset) openEntry(id);
  if (entries.byId[id].type == null) entry.classList.remove("collapsed");
}

function onEntryMoved(id: string, parentId: string, index: number) {
  entries.client_move(id, parentId, index);

  const entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`) as HTMLLIElement;

  const oldParentId: string = entryElt.dataset["parentId"];
  if (oldParentId != null) {
    const oldParentElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${oldParentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[oldParentId];
    const childrenElt = oldParentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  const nodeType = (entryElt.classList.contains("group")) ? "group" : "item";

  let parentElt: HTMLLIElement;
  if (parentId != null) {
    parentElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[parentId];
    const childrenElt = parentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  ui.entriesTreeView.insertAt(entryElt, nodeType, index, parentElt);
  if (parentId != null) entryElt.dataset["parentId"] = parentId;
  else delete entryElt.dataset["parentId"];

  refreshAssetTabElement(entries.byId[id]);
}

function onEntryTrashed(id: string) {
  entries.client_remove(id);

  const entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`) as HTMLLIElement;

  const oldParentId: string = entryElt.dataset["parentId"];
  if (oldParentId != null) {
    const oldParentElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${oldParentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[oldParentId];
    const childrenElt = oldParentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  ui.entriesTreeView.remove(entryElt);
}

function onSetEntryProperty(id: string, key: string, value: any) {
  entries.client_setProperty(id, key, value);

  const entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  switch (key) {
    case "name":
      entryElt.querySelector(".name").textContent = value;

      const walk = (entry: SupCore.Data.EntryNode) => {
        refreshAssetTabElement(entry);
        if (entry.children != null) for (const child of entry.children) walk(child);
      };

      walk(entries.byId[id]);
      break;
  }
}

function onBadgeSet(id: string, newBadge: SupCore.Data.BadgeItem) {
  const badges = entries.badgesByEntryId[id];

  const existingBadge = badges.byId[newBadge.id];
  if (existingBadge != null) {
    existingBadge.type = newBadge.type;
    existingBadge.data = newBadge.data;
  } else badges.client_add(newBadge, null);

  const badgesElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}'] .badges`);
  const badgeSpan = document.createElement("span");
  badgeSpan.className = newBadge.id;
  badgeSpan.textContent = SupClient.i18n.t(`badges:${newBadge.id}`);
  badgesElt.appendChild(badgeSpan);
}

function onBadgeCleared(id: string, badgeId: string) {
  const badges = entries.badgesByEntryId[id];
  badges.client_remove(badgeId);

  const badgeElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${id}'] .badges .${badgeId}`);
  badgeElt.parentElement.removeChild(badgeElt);
}

function onDependenciesAdded(id: string, depIds: string[]) {
  for (const depId of depIds) entries.byId[depId].dependentAssetIds.push(id);
}

function onDependenciesRemoved(id: string, depIds: string[]) {
  for (const depId of depIds) {
    const dependentAssetIds = entries.byId[depId].dependentAssetIds;
    dependentAssetIds.splice(dependentAssetIds.indexOf(id), 1);
  }
}

// User interface
function goToHub() {
  if (SupApp != null) SupApp.showMainWindow();
  else window.location.replace("/");
}

function runProject(options: { debug: boolean; } = { debug: false }) {
  if (SupApp != null) {
    if (runWindow == null) {
      runWindow = SupApp.openWindow(`${window.location.origin}/build.html`);
      runWindow.setMenuBarVisibility(false);
      runWindow.on("closed", onCloseRunWindow);

      (document.querySelector(".project-buttons") as HTMLDivElement).classList.toggle("running", true);
    }
    runWindow.show();
    runWindow.focus();

    (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = false;
  } else window.open("/build.html", `player_${SupClient.query.project}`);

  socket.emit("build:project", (err: string, buildId: string) => {
    if (err != null) {
      /* tslint:disable:no-unused-expression */
      new SupClient.Dialogs.InfoDialog(err);
      /* tslint:enable:no-unused-expression */
      return;
    }

    let url = `${window.location.protocol}//${window.location.hostname}:${buildPort}/systems/${SupCore.system.id}/?project=${SupClient.query.project}&build=${buildId}`;
    if (options.debug) url += "&debug";

    if (SupApp != null) {
      if (runWindow != null) runWindow.loadURL(url);
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
  if (SupApp != null) SupApp.chooseFolder(onPublishFolderChosen);
}

function onPublishFolderChosen(err: string, outputFolder: string) {
  if (err != null) {
    /* tslint:disable:no-unused-expression */
    new SupClient.Dialogs.InfoDialog(err);
    /* tslint:enable:no-unused-expression */
    return;
  }

  if (outputFolder == null) return;

  socket.emit("build:project", (err: string, buildId: string, files: any) => {
    const baseURL = `${window.location.protocol}//${window.location.hostname}`;

    SupApp.publishProject({
      projectId: SupClient.query.project, buildId,
      baseURL, mainPort: parseInt(window.location.port, 10), buildPort,
      outputFolder, files
    });
  });
}

function createEntryElement(entry: SupCore.Data.EntryNode) {
  const liElt = document.createElement("li");
  liElt.dataset["id"] = entry.id;
  const parentEntry = entries.parentNodesById[entry.id];
  if (parentEntry != null) liElt.dataset["parentId"] = parentEntry.id;

  if (entry.type != null) {
    liElt.dataset["assetType"] = entry.type;

    const iconElt = document.createElement("img");
    iconElt.draggable = false;
    iconElt.src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
    liElt.appendChild(iconElt);
  }

  const nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = entry.name;
  liElt.appendChild(nameSpan);

  if (entry.type != null) {
    liElt.addEventListener("mouseenter", (event) => { liElt.appendChild(ui.openInNewWindowButton); });
    liElt.addEventListener("mouseleave", (event) => {
      if (ui.openInNewWindowButton.parentElement != null) ui.openInNewWindowButton.parentElement.removeChild(ui.openInNewWindowButton);
    });

    const badgesSpan = document.createElement("span");
    badgesSpan.className = "badges";

    for (const badge of entry.badges) {
      const badgeSpan = document.createElement("span");
      badgeSpan.className = badge.id;
      badgeSpan.textContent = SupClient.i18n.t(`badges:${badge.id}`);
      badgesSpan.appendChild(badgeSpan);
    }
    liElt.appendChild(badgesSpan);
  } else {
    const childrenElt = document.createElement("span");
    childrenElt.className = "children";
    childrenElt.textContent = `(${entry.children.length})`;
    liElt.appendChild(childrenElt);
    childrenElt.style.display = "none";

    liElt.addEventListener("mouseenter", (event) => { childrenElt.style.display = ""; });
    liElt.addEventListener("mouseleave", (event) => { childrenElt.style.display = "none"; });
  }
  return liElt;
}

function setupFilterStrip() {
  const filterElt = ui.entriesFilterStrip;
  filterElt.innerHTML = "";

  const toggleAllElt = document.createElement("img");
  toggleAllElt.draggable = false;
  toggleAllElt.classList.add("toggle-all");
  toggleAllElt.addEventListener("click", onToggleAllFilterClick);
  filterElt.appendChild(toggleAllElt);

  for (const assetType of assetTypes) {
    const iconElt = document.createElement("img");
    iconElt.draggable = false;
    iconElt.addEventListener("click", onToggleAssetTypeFilterClick);
    iconElt.dataset["assetType"] = assetType;
    iconElt.src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[assetType].pluginPath}/editors/${assetType}/icon.svg`;
    filterElt.appendChild(iconElt);
  }
}

function onToggleAssetTypeFilterClick(event: MouseEvent) {
  const filterElt = event.target as HTMLElement;
  const filtered = filterElt.classList.toggle("filtered");

  const assetType = filterElt.dataset["assetType"];
  const entryElts = (ui.entriesTreeView.treeRoot.querySelectorAll(`[data-asset-type='${assetType}']`) as any as HTMLElement[]);

  for (const entryElt of entryElts) entryElt.hidden = filtered;

  let allAssetTypesFiltered = true;
  for (const assetType of assetTypes) {
    const filtered = ui.entriesFilterStrip.querySelector(`[data-asset-type='${assetType}']`).classList.contains("filtered");
    if (!filtered) { allAssetTypesFiltered = false; break; }
  }

  ui.entriesFilterStrip.querySelector(`.toggle-all`).classList.toggle("filtered", allAssetTypesFiltered);
}

function onToggleAllFilterClick() {
  const enableAllFilters = !(ui.entriesFilterStrip.querySelector(".toggle-all") as HTMLElement).classList.contains("filtered");
  const filterElts = ui.entriesFilterStrip.querySelectorAll("img") as any as HTMLImageElement[];

  for (const filterElt of filterElts) {
    filterElt.classList.toggle("filtered", enableAllFilters);

    const assetType = filterElt.dataset["assetType"];
    const entryElts = ui.entriesTreeView.treeRoot.querySelectorAll(`[data-asset-type='${assetType}']`) as any as HTMLElement[];
    for (const entryElt of entryElts) entryElt.hidden = enableAllFilters;
  }
}

function onEntryDragStart(event: DragEvent, entryElt: HTMLLIElement) {
  const id = entryElt.dataset["id"];
  event.dataTransfer.setData("text/plain", entries.getPathFromId(id));

  const entryIds = [ id ];
  for (const node of ui.entriesTreeView.selectedNodes) {
    if (node.dataset["id"] !== id) entryIds.push(node.dataset["id"]);
  }
  event.dataTransfer.setData("application/vnd.superpowers.entry", entryIds.join(","));
  return true;
}

function onTreeViewDrop(event: DragEvent, dropLocation: TreeView.DropLocation, orderedNodes: HTMLLIElement[]) {
  if (orderedNodes == null) {
    // TODO: Support creating assets by importing some files
    return false;
  }

  const dropPoint = SupClient.getTreeViewDropPoint(dropLocation, entries);

  const entryIds: string[] = [];
  for (const entry of orderedNodes) entryIds.push(entry.dataset["id"]);

  const sourceParentNode = entries.parentNodesById[entryIds[0]];
  const sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : entries.pub;
  const sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (const id of entryIds) {
    socket.emit("move:entries", id, dropPoint.parentId, dropPoint.index + i, (err: string) => {
      if (err != null) {
        /* tslint:disable:no-unused-expression */
        new SupClient.Dialogs.InfoDialog(err);
        /* tslint:enable:no-unused-expression */
        return;
      }
    });
    if (!sameParent || sourceChildren.indexOf(entries.byId[id]) >= dropPoint.index) i++;
  }
  return false;
}

function updateSelectedEntry() {
  const allButtons = document.querySelectorAll(".entries-buttons button.edit");
  for (let index = 0; index < allButtons.length; index++) {
    const button = allButtons.item(index) as HTMLButtonElement;
    const disabled = (ui.entriesTreeView.selectedNodes.length === 0 ||
      (button.classList.contains("single") && ui.entriesTreeView.selectedNodes.length !== 1) ||
      (button.classList.contains("asset-only") && ui.entriesTreeView.selectedNodes[0].classList.contains("group")));

    button.disabled = disabled;
  }
}

function onEntryActivate() {
  const activatedEntry = ui.entriesTreeView.selectedNodes[0];
  openEntry(activatedEntry.dataset["id"]);
}

function onMessage(event: any) {
  switch(event.data.type) {
    case "chat": onMessageChat(event.data.content); break;
    case "hotkey": onMessageHotKey(event.data.content); break;
    case "openEntry": openEntry(event.data.id, event.data.state); break;
    case "openTool": openTool(event.data.name, event.data.state); break;
    case "error": onWindowDevError(); break;
  }
}

function onWindowDevError() {
  const projectManagementDiv = document.querySelector(".project-management") as HTMLDivElement;
  projectManagementDiv.style.backgroundColor = "#c42";
  return false;
}

function onMessageChat(message: string) {
  if (ui.homeTab == null) return;

  const isHomeTabVisible = ui.homeTab.classList.contains("active");
  if (isHomeTabVisible && !document.hidden) return;

  if (!isHomeTabVisible) ui.homeTab.classList.add("unread");

  if (localStorage.getItem("superpowers-disable-notifications") != null) return;

  function doNotification() {
    const title = SupClient.i18n.t("project:header.notifications.new", { projectName: manifest.pub.name });
    const notification = new (window as any).Notification(title, { icon: "/images/icon.png", body: message });

    const closeTimeoutId = setTimeout(() => { notification.close(); }, 5000);

    notification.addEventListener("click", () => {
      window.focus();
      onTabActivate(ui.homeTab);
      clearTimeout(closeTimeoutId);
      notification.close();
    });
  }

  if ((window as any).Notification.permission === "granted") doNotification();
  else if ((window as any).Notification.permission !== "denied") {
    (window as any).Notification.requestPermission((status: string) => {
      (window as any).Notification.permission = status;
      if ((window as any).Notification.permission === "granted") doNotification();
    });
  }
}

function onMessageHotKey(action: string) {
  switch (action) {
    case "newAsset":     onNewAssetClick(); break;
    case "newFolder":    onNewFolderClick(); break;
    case "searchEntry":  onSearchEntryDialog(); break;
    case "filter":       onToggleFilterStripClick(); break;
    case "closeTab":     onTabClose(ui.tabStrip.tabsRoot.querySelector(".active") as HTMLLIElement); break;
    case "previousTab":  onActivatePreviousTab(); break;
    case "nextTab":      onActivateNextTab(); break;
    case "run":          runProject(); break;
    case "debug":        runProject({ debug: true }); break;
    case "devtools":     if (SupApp != null) SupApp.getCurrentWindow().webContents.toggleDevTools(); break;
  }
}

function onClickToggleNotifications(event: any) {
  let notificationsDisabled = (localStorage.getItem("superpowers-disable-notifications") != null) ? true : false;
  notificationsDisabled = !notificationsDisabled;

  if (!notificationsDisabled) {
    localStorage.removeItem("superpowers-disable-notifications");
    event.target.classList.remove("disabled");
    event.target.title = SupClient.i18n.t("project:header.notifications.disable");
  } else {
    localStorage.setItem("superpowers-disable-notifications", "true");
    event.target.classList.add("disabled");
    event.target.title = SupClient.i18n.t("project:header.notifications.enable");
  }
}

function onSearchEntryDialog() {
  if (entries == null) return;

  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.FindAssetDialog(entries, editorsByAssetType, (entryId) => {
    /* tslint:enable:no-unused-expression */
    if (entryId == null) return;
    openEntry(entryId);

    ui.entriesTreeView.clearSelection();
    const entryElt = ui.entriesTreeView.treeRoot.querySelector(`[data-id='${entryId}']`) as HTMLLIElement;
    ui.entriesTreeView.addToSelection(entryElt);
    ui.entriesTreeView.scrollIntoView(entryElt);
  });
}

function openEntry(id: string, state?: {[name: string]: any}) {
  const entry = entries.byId[id];

  // Just toggle folders
  if (entry.type == null) { ui.entriesTreeView.selectedNodes[0].classList.toggle("collapsed"); return; }

  let tab = ui.tabStrip.tabsRoot.querySelector(`li[data-asset-id='${id}']`) as HTMLLIElement;
  let iframe = ui.panesElt.querySelector(`iframe[data-asset-id='${id}']`) as HTMLIFrameElement;

  if (tab == null) {
    tab = createAssetTabElement(entry);
    ui.tabStrip.tabsRoot.appendChild(tab);

    iframe = document.createElement("iframe");
    iframe.dataset["assetId"] = id;
    iframe.src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/?project=${SupClient.query.project}&asset=${id}`;
    if (state != null) iframe.addEventListener("load", () => { iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin); });
    ui.panesElt.appendChild(iframe);
  } else if (state != null) iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin);

  onTabActivate(tab);
  return tab;
}

function openTool(name: string, state?: { [name: string]: any }) {
  let tab = ui.tabStrip.tabsRoot.querySelector(`li[data-pane='${name}']`) as HTMLLIElement;
  let iframe = ui.panesElt.querySelector(`iframe[data-name='${name}']`) as HTMLIFrameElement;

  if (tab == null) {
    const tool = toolsByName[name];
    tab = createToolTabElement(name, tool);

    if (toolsByName[name].pinned) {
      const toolElt = ui.toolsElt.querySelector(`li[data-name="${name}"]`) as HTMLLIElement;
      if (toolElt != null) toolElt.parentElement.removeChild(toolElt);

      const firstUnpinnedTab = ui.tabStrip.tabsRoot.querySelector("li:not(.pinned)") as HTMLLIElement;
      ui.tabStrip.tabsRoot.insertBefore(tab, firstUnpinnedTab);
    } else {
      ui.tabStrip.tabsRoot.appendChild(tab);
    }

    iframe = document.createElement("iframe");
    iframe.dataset["name"] = name;
    iframe.src = `/systems/${SupCore.system.id}/plugins/${tool.pluginPath}/editors/${name}/?project=${SupClient.query.project}`;
    if (state != null) iframe.addEventListener("load", () => { iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin); });
    ui.panesElt.appendChild(iframe);
  } else if (state != null) iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin);

  onTabActivate(tab);

  if (name === "main") ui.homeTab = tab;
}

function onNewAssetClick() {
  /* tslint:disable:no-unused-expression */
  new CreateAssetDialog(autoOpenAsset, (result) => {
    /* tslint:enable:no-unused-expression */
    if (result == null) return;

    if (result.name === "")
      result.name = SupClient.i18n.t(`${editorsByAssetType[result.type].pluginPath}:editors.${result.type}.title`);

    autoOpenAsset = result.open;
    socket.emit("add:entries", result.name, result.type, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function onNewFolderClick() {
  const options = {
    placeholder: SupClient.i18n.t("project:treeView.newFolder.placeholder"),
    initialValue: SupClient.i18n.t("project:treeView.newFolder.initialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("project:treeView.newFolder.prompt"), options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;

    socket.emit("add:entries", name, null, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function onTrashEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length === 0) return;

  const selectedEntries: SupCore.Data.EntryNode[] = [];

  function checkNextEntry() {
    selectedEntries.splice(0, 1);
    if (selectedEntries.length === 0) {
      const confirmLabel = SupClient.i18n.t("project:treeView.trash.prompt");
      const validationLabel = SupClient.i18n.t("project:treeView.trash.title");

      /* tslint:disable:no-unused-expression */
      new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
        /* tslint:enable:no-unused-expression */
        if (!confirm) return;

        for (const selectedNode of ui.entriesTreeView.selectedNodes) {
          const entry = entries.byId[selectedNode.dataset["id"]];
          socket.emit("trash:entries", entry.id, (err: string) => {
            if (err != null) {
              /* tslint:disable:no-unused-expression */
              new SupClient.Dialogs.InfoDialog(err);
              /* tslint:enable:no-unused-expression */
              return;
            }
          });
        }
        ui.entriesTreeView.clearSelection();
      });

    } else warnBrokenDependency(selectedEntries[0]);
  }

  function warnBrokenDependency(entry: SupCore.Data.EntryNode) {
    if (entry.type == null) for (const entryChild of entry.children) selectedEntries.push(entryChild);

    if (entry.dependentAssetIds != null && entry.dependentAssetIds.length > 0) {
      const dependentAssetNames: string[] = [];
      for (const usingId of entry.dependentAssetIds) dependentAssetNames.push(entries.getPathFromId(usingId));
      /* tslint:disable:no-unused-expression */
      const infoLabel = SupClient.i18n.t("project:treeView.trash.warnBrokenDependency", {
        entryName: entries.getPathFromId(entry.id), dependentEntryNames: dependentAssetNames.join(", ")
      });
      new SupClient.Dialogs.InfoDialog(infoLabel, null, () => { checkNextEntry(); });
      /* tslint:enable:no-unused-expression */
    } else checkNextEntry();
  }

  for (const selectedNode of ui.entriesTreeView.selectedNodes) selectedEntries.push(entries.byId[selectedNode.dataset["id"]]);
  warnBrokenDependency(selectedEntries[0]);
}

function onOpenInNewWindowClick(event: any) {
  const id = event.target.parentElement.dataset["id"];
  const name = event.target.parentElement.dataset["name"];
  let url: string;

  if (id != null) url = `${window.location.origin}/project/?project=${SupClient.query.project}&asset=${id}`;
  else url = `${window.location.origin}/project/?project=${SupClient.query.project}&tool=${name}`;

  if (SupApp != null) SupApp.openWindow(url);
  else window.open(url);
}

function onRenameEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length !== 1) return;

  const selectedNode = ui.entriesTreeView.selectedNodes[0];
  const entry = entries.byId[selectedNode.dataset["id"]];

  const options = {
    initialValue: entry.name,
    validationLabel: SupClient.i18n.t("common:actions.rename"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("project:treeView.renamePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null || newName === entry.name) return;

    socket.emit("setProperty:entries", entry.id, "name", newName, (err: string) => {
      if (err != null) {
        /* tslint:disable:no-unused-expression */
        new SupClient.Dialogs.InfoDialog(err);
        /* tslint:enable:no-unused-expression */
        return;
      }
    });
  });
}

function onDuplicateEntryClick() {
  if (ui.entriesTreeView.selectedNodes.length !== 1) return;

  const selectedNode = ui.entriesTreeView.selectedNodes[0];
  const entry = entries.byId[selectedNode.dataset["id"]];
  if (entry.type == null) return;

  const options = {
    initialValue: entry.name,
    validationLabel: SupClient.i18n.t("common:actions.duplicate"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("project:treeView.duplicatePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;

    socket.emit("duplicate:entries", newName, entry.id, SupClient.getTreeViewInsertionPoint(ui.entriesTreeView), onEntryAddedAck);
  });
}

function onToggleFilterStripClick() {
  ui.entriesFilterStrip.hidden = !ui.entriesFilterStrip.hidden;

  if (ui.entriesFilterStrip.hidden) {
    const hiddenEntryElts = ui.entriesTreeView.treeRoot.querySelectorAll("li.item[hidden]") as any as HTMLLIElement[];
    for (const hiddenEntryElt of hiddenEntryElts) hiddenEntryElt.hidden = false;
  } else {
    for (const assetType of assetTypes) {
      const filtered = ui.entriesFilterStrip.querySelector(`[data-asset-type='${assetType}']`).classList.contains("filtered");
      const entryElts = (ui.entriesTreeView.treeRoot.querySelectorAll(`[data-asset-type='${assetType}']`) as any as HTMLElement[]);
      for (const entryElt of entryElts) entryElt.hidden = filtered;
    }
  }
}

function refreshAssetTabElement(entry: SupCore.Data.EntryNode, tabElt?: HTMLLIElement) {
  if (tabElt == null) tabElt = ui.tabStrip.tabsRoot.querySelector(`li[data-asset-id='${entry.id}']`) as HTMLLIElement;
  if (tabElt == null) return;

  const entryPath = entries.getPathFromId(entry.id);
  const entryName = entry.name;

  const lastSlash = entryPath.lastIndexOf("/");
  let entryLocation = (lastSlash !== -1) ? entryPath.slice(0, lastSlash) : "";

  const maxEntryLocationLength = 20;
  while (entryLocation.length > maxEntryLocationLength) {
    const slashIndex = entryLocation.indexOf("/", 2);
    if (slashIndex === -1) break;
    entryLocation = `…/${entryLocation.slice(slashIndex + 1)}`;
  }

  tabElt.querySelector(".label .location").textContent = entryLocation;
  tabElt.querySelector(".label .name").textContent = entryName;
  tabElt.title = entryPath;
}

function createAssetTabElement(entry: SupCore.Data.EntryNode) {
  const tabElt = document.createElement("li");

  if (entry.type != null) {
    const iconElt = document.createElement("img");
    iconElt.classList.add("icon");
    iconElt.src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
    tabElt.appendChild(iconElt);
  }

  const tabLabel = document.createElement("div");
  tabLabel.classList.add("label");
  tabElt.appendChild(tabLabel);

  const tabLabelLocation = document.createElement("div");
  tabLabelLocation.classList.add("location");
  tabLabel.appendChild(tabLabelLocation);

  const tabLabelName = document.createElement("div");
  tabLabelName.classList.add("name");
  tabLabel.appendChild(tabLabelName);

  const closeButton = document.createElement("button");
  closeButton.classList.add("close");
  closeButton.addEventListener("click", () => { onTabClose(tabElt); });
  tabElt.appendChild(closeButton);

  tabElt.dataset["assetId"] = entry.id;

  refreshAssetTabElement(entry, tabElt);

  return tabElt;
}

function createToolTabElement(toolName: string, tool: EditorManifest) {
  const tabElt = document.createElement("li");

  const iconElt = document.createElement("img");
  iconElt.classList.add("icon");
  iconElt.src = `/systems/${SupCore.system.id}/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg`;
  tabElt.appendChild(iconElt);

  if (!tool.pinned) {
    const tabLabel = document.createElement("div");
    tabLabel.classList.add("label");
    tabElt.appendChild(tabLabel);

    const tabLabelName = document.createElement("div");
    tabLabelName.classList.add("name");
    tabLabel.appendChild(tabLabelName);
    tabLabelName.textContent = SupClient.i18n.t(`${tool.pluginPath}:editors.${toolName}.title`);

    const closeButton = document.createElement("button");
    closeButton.classList.add("close");
    closeButton.addEventListener("click", () => { onTabClose(tabElt); });
    tabElt.appendChild(closeButton);
  } else {
    tabElt.classList.add("pinned");
  }

  tabElt.dataset["pane"] = toolName;
  return tabElt;
}

function onTabActivate(tabElement: HTMLLIElement) {
  const activeTab = ui.tabStrip.tabsRoot.querySelector(".active");
  if (activeTab != null) {
    activeTab.classList.remove("active");

    const activeIframe = (ui.panesElt.querySelector("iframe.active") as HTMLIFrameElement);
    activeIframe.contentWindow.postMessage({ type: "deactivate" }, window.location.origin);
    activeIframe.classList.remove("active");
  }

  tabElement.classList.add("active");
  tabElement.classList.remove("unread");

  const assetId = tabElement.dataset["assetId"];
  let tabIframe: HTMLIFrameElement;
  if (assetId != null) tabIframe = ui.panesElt.querySelector(`iframe[data-asset-id='${assetId}']`) as HTMLIFrameElement;
  else tabIframe = ui.panesElt.querySelector(`iframe[data-name='${tabElement.dataset["pane"]}']`) as HTMLIFrameElement;

  tabIframe.classList.add("active");
  tabIframe.contentWindow.focus();
  tabIframe.contentWindow.postMessage({ type: "activate" }, window.location.origin);
}

function onTabClose(tabElement: HTMLLIElement) {
  const assetId = tabElement.dataset["assetId"];
  let frameElt: HTMLIFrameElement;
  if (assetId != null) frameElt = ui.panesElt.querySelector(`iframe[data-asset-id='${assetId}']`) as HTMLIFrameElement;
  else {
    if (tabElement.classList.contains("pinned")) return;
    const toolName = tabElement.dataset["pane"];
    frameElt = ui.panesElt.querySelector(`iframe[data-name='${toolName}']`) as HTMLIFrameElement;
  }

  if (tabElement.classList.contains("active")) {
    const activeTabElement = (tabElement.nextElementSibling != null) ? tabElement.nextElementSibling as HTMLLIElement : tabElement.previousElementSibling as HTMLLIElement;
    if (activeTabElement != null) onTabActivate(activeTabElement);
  }

  tabElement.parentElement.removeChild(tabElement);
  frameElt.parentElement.removeChild(frameElt);
}

function onActivatePreviousTab() {
  const activeTabElt = ui.tabStrip.tabsRoot.querySelector(".active");
  for (let tabIndex = 0; ui.tabStrip.tabsRoot.children.length; tabIndex++) {
    const tabElt = ui.tabStrip.tabsRoot.children[tabIndex];
    if (tabElt === activeTabElt) {
      const newTabIndex = (tabIndex === 0) ? ui.tabStrip.tabsRoot.children.length - 1 : tabIndex - 1;
      onTabActivate(ui.tabStrip.tabsRoot.children[newTabIndex] as HTMLLIElement);
      return;
    }
  }
}

function onActivateNextTab() {
  const activeTabElt = ui.tabStrip.tabsRoot.querySelector(".active");
  for (let tabIndex = 0; ui.tabStrip.tabsRoot.children.length; tabIndex++) {
    const tabElt = ui.tabStrip.tabsRoot.children[tabIndex];
    if (tabElt === activeTabElt) {
      const newTabIndex = (tabIndex === ui.tabStrip.tabsRoot.children.length - 1) ? 0 : tabIndex + 1;
      onTabActivate(ui.tabStrip.tabsRoot.children[newTabIndex] as HTMLLIElement);
      return;
    }
  }
}
