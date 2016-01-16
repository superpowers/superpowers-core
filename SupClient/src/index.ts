import * as io from "socket.io-client";
import * as querystring from "querystring";
import * as cookies from "js-cookie";

/* tslint:disable:no-unused-variable */
import fetch from "./fetch";
import ProjectClient from "./ProjectClient";
import setupHotkeys, { setupHelpCallback } from "./setupHotkeys";
import * as table from "./table";
import * as dialogs from "./dialogs/index";
import * as i18n from "./i18n";
/* tslint:enable:no-unused-variable */
/* tslint:disable */
const PerfectResize = require("perfect-resize");
/* tslint:enable */

export { fetch, cookies, ProjectClient, setupHotkeys, setupHelpCallback, table, dialogs, i18n };

export const isApp = window.navigator.userAgent.indexOf("Electron") !== -1;
export const query = querystring.parse(window.location.search.slice(1));

// Refuses filesystem-unsafe characters
// See http://superuser.com/q/358855
export const namePattern = "[^\\\\/:*?\"<>|\\[\\]]+";

// Initialize empty system
SupCore.system = new SupCore.System("", "");

export let activePluginPath: string;
export const plugins: { [context: string]: { [name: string]: { path: string; content: any; } } } = {};
export function registerPlugin(context: string, name: string, content: any) {
  if (plugins[context] == null) plugins[context] = {};

  if (plugins[context][name] != null) {
    console.error(`SupClient.registerPlugin: Tried to register two or more plugins named "${name}"`);
    return;
  }

  plugins[context][name] = { path: activePluginPath, content };
}

// Plugins list
export function connect(projectId: string, options?: { reconnection?: boolean; }) {
  if (options == null) options = {};
  if (options.reconnection == null) options.reconnection = false;

  const namespace = (projectId != null) ? `project:${projectId}` : "hub";

  const supServerAuth = cookies.get("supServerAuth");
  const socket = io.connect(`${window.location.protocol}//${window.location.host}/${namespace}`,
    { transports: [ "websocket" ], reconnection: options.reconnection, query: { supServerAuth } }
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

export function getTreeViewInsertionPoint(treeView: any) {
  let selectedElt = treeView.selectedNodes[0];
  let parentId: string;
  let index: number;

  if (selectedElt != null) {
    if (selectedElt.classList.contains("group")) {
      parentId = selectedElt.dataset.id;
    }
    else {
      if (selectedElt.parentElement.classList.contains("children")) {
        parentId = selectedElt.parentElement.previousSibling.dataset.id;
      }

      index = 1;
      while (selectedElt.previousSibling != null) {
        selectedElt = selectedElt.previousSibling;
        if (selectedElt.tagName === "LI") index++;
      }
    }
  }
  return { parentId, index };
}

export function getTreeViewDropPoint(dropInfo: any, treeById: SupCore.Data.Base.TreeById) {
  let parentId: string;
  let index: number;

  let parentNode: any;
  const targetEntryId = dropInfo.target.dataset.id;

  switch (dropInfo.where) {
    case "inside": {
      parentNode = treeById.byId[targetEntryId];
      index = parentNode.children.length;
    } break;
    case "above":
    case "below": {
      const targetNode = treeById.byId[targetEntryId];
      parentNode = treeById.parentNodesById[targetNode.id];

      index = (parentNode != null) ? parentNode.children.indexOf(targetNode) : treeById.pub.indexOf(targetNode);

      if (dropInfo.where === "below") index++;
    } break;
  }

  if (parentNode != null) parentId = parentNode.id;
  return { parentId, index };
}

export function getListViewDropIndex(dropInfo: any, listById: SupCore.Data.Base.ListById, reversed = false) {
  const targetEntryId = dropInfo.target.dataset.id;
  const targetNode = listById.byId[targetEntryId];

  let index = listById.pub.indexOf(targetNode);
  if (!reversed && dropInfo.where === "below") index++;
  if ( reversed && dropInfo.where === "above") index++;
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

export function setupCollapsablePane(paneElt: HTMLDivElement, refreshCallback?: Function) {
  const handle = new PerfectResize(paneElt, "bottom");
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
