import * as io from "socket.io-client";

import ProjectClient from "./ProjectClient"
import * as component from "./component";
import * as dialogs from "./dialogs/index";
export { ProjectClient, component, dialogs };

let pluginsXHR = new XMLHttpRequest();
pluginsXHR.open('GET', '/plugins.json', false); // Synchronous
pluginsXHR.send(null);

let internalPluginPaths: any;
if (pluginsXHR.status == 200) internalPluginPaths = JSON.parse(pluginsXHR.responseText);
export let pluginPaths = internalPluginPaths;

export function connect(projectId: string, options: { reconnection: boolean; promptCredentials: boolean; } = { reconnection: false, promptCredentials: false }) {
  let namespace = (projectId != null) ? `project:${projectId}` : "hub";

  let supServerAuth = localStorage.getItem('supServerAuth');
  let socket = io.connect(`${window.location.protocol}//${window.location.host}/${namespace}`,
    { transports: [ 'websocket' ], reconnection: options.reconnection, query: { supServerAuth } }
  );

  if (options.promptCredentials) socket.on('error', onSocketError);
  return socket;
}

function onSocketError(error: string) {
  document.body.innerHTML = '';
  if (error === 'invalidCredentials') {
    promptServerPassword((serverPassword) => {
      promptUsername((username) => {
        setupAuth(serverPassword, username);
      });
    });
  }
  else if (error === 'invalidUsername') {
    promptUsername((username) => {
      setupAuth('', username);
    });
  }
}

function promptServerPassword(callback: (password: string) => any) {
  dialogs.prompt("Please enter the server password.", '', '', "Connect", { type: 'password' }, callback);
}

function promptUsername(callback: (username: string) => any) {
  dialogs.prompt("Please choose a username.", '', '', "Connect", { pattern: '[A-Za-z0-9_]{3,20}' }, callback);
}

function setupAuth(serverPassword: string, username: string) {
  localStorage.setItem('supServerAuth', JSON.stringify({ serverPassword, username }));
  window.location.reload();
}

export function onAssetTrashed() {
  document.body.innerHTML = '';

  let h1 = document.createElement('h1');
  h1.textContent = 'This asset has been trashed.';

  /*
  // TODO: window.parent.postMessage(...) or window.close()
  button = document.createElement('button')
  button.textContent = 'Close'
  button.addEventListener 'click', => ...
  */

  let div = document.createElement('div');
  div.className = 'superpowers-error';
  div.appendChild(h1);
  // div.appendChild button
  document.body.appendChild(div);
}

export function onDisconnected() {
  document.body.innerHTML = '';

  let h1 = document.createElement('h1');
  h1.textContent = 'You were disconnected.';

  let button = document.createElement('button');
  button.textContent = 'Reconnect';
  button.addEventListener('click', () => { location.reload(); });

  let div = document.createElement('div');
  div.className = 'superpowers-error';
  div.appendChild(h1);
  div.appendChild(button);
  document.body.appendChild(div);
}

export function setupHotkeys() {
  document.addEventListener('keydown', (event) => {
    if (document.querySelector(".dialog") != null) return;

    // window.location.origin isn't listed in lib.d.ts as of TypeScript 1.5
    let origin: string = (<any>window.location).origin;

    function sendMessage(action: string) {
      if (window.parent != null) window.parent.postMessage({ type: "hotkey", content: action }, origin);
      else window.postMessage({ type: "hotkey", content: action}, origin);
    }

    if (event.keyCode == 78 && (event.ctrlKey || event.metaKey)) { // CTRL-N
      event.preventDefault();
      if (event.shiftKey) sendMessage("newFolder");
      else sendMessage("newAsset");
    }

    if ((event.keyCode === 79 || event.keyCode === 80) && (event.ctrlKey || event.metaKey)) { // CTRL-O or CTRL-P
      event.preventDefault(); sendMessage("searchEntry");
    }

    if (event.keyCode === 87 && (event.ctrlKey || event.metaKey)) { // CTRL-W
      event.preventDefault(); sendMessage("closeTab");
    }

    if (event.keyCode === 9 && event.ctrlKey) { // CTRL-TAB
      event.preventDefault()
      if (event.shiftKey) sendMessage("previousTab");
      else sendMessage("nextTab");
    }

    if (event.keyCode === 116 || (event.keyCode === 80 && event.metaKey)) { // F5 || Cmd-P
      event.preventDefault(); sendMessage("run");
    }
    if (event.keyCode === 117 || (event.keyCode === 80 && event.metaKey && event.shiftKey)) { // F6 or Cmd-Shift-P
      event.preventDefault(); sendMessage("debug");
    }
  });
}

export function getTreeViewInsertionPoint(treeView: any) {
  let selectedElt = treeView.selectedNodes[0];
  let parentId: string;
  let index: number;

  if (selectedElt != null) {
    if (selectedElt.classList.contains('group')) {
      parentId = selectedElt.dataset.id;
    }
    else {
      if (selectedElt.parentElement.classList.contains('children')) {
        parentId = selectedElt.parentElement.previousSibling.dataset.id;
      }

      index = 1
      while (selectedElt.previousSibling != null) {
        selectedElt = selectedElt.previousSibling;
        if (selectedElt.tagName === 'LI') index++;
      }
    }
  }
  return { parentId, index };
}

export function getTreeViewDropPoint(dropInfo: any, treeById: SupCore.data.base.TreeById) {
  let parentId: string;
  let index: number;

  let parentNode: any;
  let targetEntryId = dropInfo.target.dataset.id;

  switch (dropInfo.where) {
    case 'inside': {
      parentNode = treeById.byId[targetEntryId];
      index = parentNode.children.length;
      break;
    }
    case 'above':
    case 'below': {
      let targetNode = treeById.byId[targetEntryId];
      parentNode = treeById.parentNodesById[targetNode.id];

      index = (parentNode != null) ? parentNode.children.indexOf(targetNode) : treeById.pub.indexOf(targetNode);

      if (dropInfo.where === 'below') index++;
      break;
    }
  }

  if (parentNode != null) parentId = parentNode.id;
  return { parentId, index };
}

export function getListViewDropIndex(dropInfo: any, listById: SupCore.data.base.ListById) {
  let targetEntryId = dropInfo.target.dataset.id;
  let targetNode = listById.byId[targetEntryId];

  let index = listById.pub.indexOf(targetNode)
  if (dropInfo.where === 'below') index++;
  return index;
}

export function findEntryByPath(entries: any, path: string|string[]) {
  let parts = (typeof path === 'string') ? path.split('/') : path;
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
