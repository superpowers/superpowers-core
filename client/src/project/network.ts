import * as async from "async";

import * as entriesTreeView from "./sidebar/entriesTreeView";
import * as sidebar from "./sidebar";
import * as tabs from "./tabs";
import * as tabsAssets from "./tabs/assets";
import * as tabsTools from "./tabs/tools";

export let socket: SocketIOClient.Socket;
export let entries: SupCore.Data.Entries;
export let manifest: SupCore.Data.ProjectManifest;
export let pluginsInfo: SupCore.PluginsInfo;

let buildPort: number;

export function connect() {
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
  socket.on("save:entries", onEntrySaved);

  socket.on("set:badges", onBadgeSet);
  socket.on("clear:badges", onBadgeCleared);

  socket.on("add:dependencies", onDependenciesAdded);
  socket.on("remove:dependencies", onDependenciesRemoved);
}

function onConnectionError() {
  const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.replace(`/login?redirect=${redirect}`);
}

function onDisconnected() {
  SupClient.Dialogs.cancelDialogIfAny();
  entries = null;

  sidebar.disable();
}

function onWelcome(clientId: number, config: { buildPort: number; }) {
  buildPort = config.buildPort;

  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, thePluginsInfo: SupCore.PluginsInfo) => {
    pluginsInfo = thePluginsInfo;

    loadPluginLocales(pluginsInfo.list, () => {
      async.parallel([
        (cb) => { tabsAssets.setup(pluginsInfo.paths.editors, cb); },
        (cb) => { tabsTools.setup(pluginsInfo.paths.tools, cb); }
      ], (err) => {
        if (err) throw err;
        socket.emit("sub", "manifest", null, onManifestReceived);
        socket.emit("sub", "entries", null, onEntriesReceived);
      });
    });
  });
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

function onManifestReceived(err: string, manifestPub: SupCore.Data.ProjectManifestPub) {
  manifest = new SupCore.Data.ProjectManifest(manifestPub);

  document.querySelector(".project-name").textContent = manifestPub.name;
  document.title = `${manifestPub.name} — Superpowers`;
}

function onEntriesReceived(err: string, entriesPub: SupCore.Data.EntryNode[], nextEntryId: number) {
  entries = new SupCore.Data.Entries(entriesPub, nextEntryId);

  sidebar.enable();

  if (SupClient.query.asset != null) tabsAssets.open(SupClient.query.asset);
  else if (SupClient.query["tool"] != null) tabsTools.open(SupClient.query["tool"]);
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

  const liElt = entriesTreeView.createEntryElement(entry);
  const nodeType = (entry.children != null) ? "group" : "item";

  let parentElt: HTMLLIElement;
  if (parentId != null) {
    parentElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${parentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[parentId];
    const childrenElt = parentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  entriesTreeView.widget.insertAt(liElt, nodeType, index, parentElt);
}

function onEntryMoved(id: string, parentId: string, index: number) {
  entries.client_move(id, parentId, index);

  const entryElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${id}']`) as HTMLLIElement;

  const oldParentId: string = entryElt.dataset["parentId"];
  if (oldParentId != null) {
    const oldParentElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${oldParentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[oldParentId];
    const childrenElt = oldParentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  const nodeType = (entryElt.classList.contains("group")) ? "group" : "item";

  let parentElt: HTMLLIElement;
  if (parentId != null) {
    parentElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${parentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[parentId];
    const childrenElt = parentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  entriesTreeView.widget.insertAt(entryElt, nodeType, index, parentElt);
  if (parentId != null) entryElt.dataset["parentId"] = parentId;
  else delete entryElt.dataset["parentId"];

  tabsAssets.refreshTabElement(entries.byId[id]);
}

function onEntryTrashed(id: string) {
  entries.client_remove(id);

  const entryElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${id}']`) as HTMLLIElement;

  const oldParentId: string = entryElt.dataset["parentId"];
  if (oldParentId != null) {
    const oldParentElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${oldParentId}']`) as HTMLLIElement;
    const parentEntry = entries.byId[oldParentId];
    const childrenElt = oldParentElt.querySelector("span.children");
    childrenElt.textContent = `(${parentEntry.children.length})`;
  }

  entriesTreeView.widget.remove(entryElt);
}

function onSetEntryProperty(id: string, key: string, value: any) {
  entries.client_setProperty(id, key, value);

  const entryElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${id}']`);

  switch (key) {
    case "name":
      entryElt.querySelector(".name").textContent = value;

      const walk = (entry: SupCore.Data.EntryNode) => {
        tabsAssets.refreshTabElement(entry);
        if (entry.children != null) for (const child of entry.children) walk(child);
      };

      walk(entries.byId[id]);
      break;
  }
}

function onEntrySaved(id: string, revisionId: string, revisionName: string) {
  entries.client_save(id, revisionId, revisionName);

  const revisionPaneElt = tabs.panesElt.querySelector(`[data-asset-id='${id}'] .revision-inner-container`) as HTMLDivElement;
  if (revisionPaneElt == null) return;

  const revisions = entries.byId[id].revisions;
  const selectElt = revisionPaneElt.querySelector("select") as HTMLSelectElement;
  const optionElt = SupClient.html("option", { textContent: revisionName, dataset: { id: revisionId } });
  if (revisions.length === 1) {
    selectElt.appendChild(optionElt);
  } else {
    const previousRevisionId = revisions[revisions.length - 2].id;
    const previousRevisionElt = selectElt.querySelector(`[data-id='${previousRevisionId}']`);
    selectElt.insertBefore(optionElt, previousRevisionElt);
  }
}

function onBadgeSet(id: string, newBadge: SupCore.Data.BadgeItem) {
  const badges = entries.badgesByEntryId[id];

  const existingBadge = badges.byId[newBadge.id];
  if (existingBadge != null) {
    existingBadge.type = newBadge.type;
    existingBadge.data = newBadge.data;
  } else badges.client_add(newBadge, null);

  const badgesElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${id}'] .badges`) as HTMLDivElement;
  SupClient.html("span", newBadge.id, { parent: badgesElt, textContent: SupClient.i18n.t(`badges:${newBadge.id}`) });
}

function onBadgeCleared(id: string, badgeId: string) {
  const badges = entries.badgesByEntryId[id];
  badges.client_remove(badgeId);

  const badgeElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${id}'] .badges .${badgeId}`);
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
