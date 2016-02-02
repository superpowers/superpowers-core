import * as io from "socket.io-client";
import * as url from "url";
import * as querystring from "querystring";
import * as cookies from "js-cookie";

import fetch from "./fetch";
import loadScript from "./loadScript";
import readFile from "./readFile";
import ProjectClient from "./ProjectClient";
import { setupHotkeys, setupHelpCallback } from "./events";
import * as table from "./table";
import * as Dialogs from "simple-dialogs";
import FindAssetDialog from "./FindAssetDialog";
import * as i18n from "./i18n";
import html from "./html";
import "./events";

import * as ResizeHandle from "resize-handle";
import * as TreeView from "dnd-tree-view";

export { fetch, loadScript, readFile, cookies, ProjectClient, setupHotkeys, setupHelpCallback, table, Dialogs, i18n, html };
export const query = querystring.parse(window.location.search.slice(1));

(Dialogs as any).FindAssetDialog = FindAssetDialog;

// Refuses filesystem-unsafe characters
// See http://superuser.com/q/358855
export const namePattern = "[^\\\\/:*?\"<>|\\[\\]]+";

// Expose SupApp to iframes
if ((global as any).SupApp == null) {
  (global as any).SupApp = ((top as any).SupApp != null) ? (top as any).SupApp : null;
}

// Initialize empty system
SupCore.system = new SupCore.System("", "");

const plugins: { [contextName: string]: { [pluginName: string]: { path: string; content: any; } } } = {};

const scriptPathRegex = /^\/systems\/([^\/])+\/plugins\/([^\/])+\/([^\/])+/;
export function registerPlugin<T>(contextName: string, pluginName: string, plugin: T) {
  if (plugins[contextName] == null) plugins[contextName] = {};

  if (plugins[contextName][pluginName] != null) {
    console.error("SupClient.registerPlugin: Tried to register two or more plugins " +
    `named "${pluginName}" in context "${contextName}"`);
    return;
  }

  const scriptURL = url.parse((document as any).currentScript.src);
  const pluginPath = scriptPathRegex.exec(scriptURL.pathname)[0];
  plugins[contextName][pluginName] = { path: pluginPath, content: plugin };
}

export function getPlugins<T>(contextName: string): { [pluginName: string]: { path: string; content: T; } } {
  return plugins[contextName];
}

// Plugins list
export function connect(projectId: string, options?: { reconnection?: boolean; }) {
  if (options == null) options = {};
  if (options.reconnection == null) options.reconnection = false;

  const namespace = (projectId != null) ? `project:${projectId}` : "hub";

  const socket = io.connect(`${window.location.protocol}//${window.location.host}/${namespace}`,
    { transports: [ "websocket" ], reconnection: options.reconnection }
  );

  socket.on("welcome", (clientId: number, config: { systemId: string; }) => {
    SupCore.system.id = config.systemId;
  });

  return socket;
}

export function onAssetTrashed() {
  document.body.innerHTML = "";

  const h1 = document.createElement("h1");
  h1.textContent = "This asset has been trashed.";

  const div = document.createElement("div");
  div.className = "superpowers-error";
  div.appendChild(h1);
  document.body.appendChild(div);
}

export function onDisconnected() {
  document.body.innerHTML = "";

  const h1 = document.createElement("h1");
  h1.textContent = "You were disconnected.";

  const button = document.createElement("button");
  button.textContent = "Reconnect";
  button.addEventListener("click", () => { location.reload(); });

  const div = document.createElement("div");
  div.className = "superpowers-error";
  div.appendChild(h1);
  div.appendChild(button);
  document.body.appendChild(div);
}

export function getTreeViewInsertionPoint(treeView: TreeView) {
  let selectedElt = treeView.selectedNodes[0];
  let parentId: string;
  let index: number;

  if (selectedElt != null) {
    if (selectedElt.classList.contains("group")) {
      parentId = selectedElt.dataset["id"];
    }
    else {
      if (selectedElt.parentElement.classList.contains("children")) {
        parentId = (selectedElt.parentElement.previousElementSibling as HTMLElement).dataset["id"];
      }

      index = 1;
      while (selectedElt.previousElementSibling != null) {
        selectedElt = selectedElt.previousElementSibling as HTMLLIElement;
        if (selectedElt.tagName === "LI") index++;
      }
    }
  }
  return { parentId, index };
}

export function getTreeViewSiblingInsertionPoint(treeView: TreeView) {
  let selectedElt = treeView.selectedNodes[0];
  let parentId: string;
  let index: number;
  parentId = (selectedElt.parentElement.previousElementSibling as HTMLElement).dataset["id"];
  return { parentId, index };
}

export function getTreeViewDropPoint(dropLocation: TreeView.DropLocation, treeById: SupCore.Data.Base.TreeById) {
  let parentId: string;
  let index: number;

  let parentNode: any;
  const targetEntryId = dropLocation.target.dataset["id"];

  switch (dropLocation.where) {
    case "inside": {
      if (targetEntryId != null) {
        parentNode = treeById.byId[targetEntryId];
        index = parentNode.children.length;
      } else {
        index = 0;
      }
    } break;
    case "above":
    case "below": {
      const targetNode = treeById.byId[targetEntryId];
      parentNode = treeById.parentNodesById[targetNode.id];

      index = (parentNode != null) ? parentNode.children.indexOf(targetNode) : treeById.pub.indexOf(targetNode);

      if (dropLocation.where === "below") index++;
    } break;
  }

  if (parentNode != null) parentId = parentNode.id;
  return { parentId, index };
}

export function getListViewDropIndex(dropLocation: TreeView.DropLocation, listById: SupCore.Data.Base.ListById, reversed = false) {
  const targetEntryId = dropLocation.target.dataset["id"];
  const targetNode = listById.byId[targetEntryId];

  let index = listById.pub.indexOf(targetNode);
  if (!reversed && dropLocation.where === "below") index++;
  if ( reversed && dropLocation.where === "above") index++;
  return index;
}

export function findEntryByPath(entries: any, path: string|string[]) {
  const parts = (typeof path === "string") ? path.split("/") : path;
  let foundEntry: any;

  entries.every((entry: any) => {
    if (entry.name === parts[0]) {
      if (parts.length === 1) {
        foundEntry = entry;
        return false;
      }

      if (entry.children == null) return true;
      foundEntry = findEntryByPath(entry.children, parts.slice(1));
      return false;
    }
    else return true;
  });

  return foundEntry;
}

export function openEntry(entryId: string, state?: any) {
  window.parent.postMessage({ type: "openEntry", id: entryId, state }, window.location.origin);
}

export function setEntryRevisionDisabled(disabled: boolean) {
  window.parent.postMessage({ type: "setEntryRevisionDisabled", id: query.asset, disabled }, window.location.origin);
}

export function setupCollapsablePane(paneElt: HTMLDivElement, refreshCallback?: Function) {
  const handle = new ResizeHandle(paneElt, "bottom");
  if (refreshCallback != null)
    handle.on("drag", () => { refreshCallback(); });

  const statusElt = paneElt.querySelector(".header") as HTMLDivElement;

  const buttonElt = document.createElement("button");
  buttonElt.classList.add("toggle");
  statusElt.appendChild(buttonElt);

  const contentElt = paneElt.querySelector(".content") as HTMLDivElement;
  const collaspe = (collapsed: boolean) => {
    contentElt.hidden = collapsed;
    buttonElt.textContent = collapsed ? "+" : "–";

    if (refreshCallback != null) refreshCallback();
  };

  collaspe(paneElt.classList.contains("collapsed"));
  statusElt.addEventListener("click", (event) => { collaspe(paneElt.classList.toggle("collapsed")); });
}
