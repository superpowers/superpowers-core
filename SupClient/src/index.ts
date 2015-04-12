import io = require("socket.io-client");

export import ProjectClient = require("./ProjectClient");
export import component = require("./component");
export import dialogs = require("./dialogs/index");

var pluginsXHR = new XMLHttpRequest();
pluginsXHR.open('GET', '/plugins.json', false); // Synchronous
pluginsXHR.send(null);

var internalPluginPaths: string;
if (pluginsXHR.status == 200) internalPluginPaths = JSON.parse(pluginsXHR.responseText);
export var pluginPaths = internalPluginPaths;

export function connect(projectId: string, options: {reconnection: boolean; promptCredentials: boolean;} = { reconnection: false, promptCredentials: false }) {
  var namespace = (projectId != null) ? `project:${projectId}` : "hub";

  var supServerAuth = localStorage.getItem('supServerAuth');
  var socket = io.connect(`${window.location.protocol}//${window.location.host}/${namespace}`,
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

  var h1 = document.createElement('h1');
  h1.textContent = 'This asset has been trashed.';

  /*
  // TODO: window.parent.postMessage(...) or window.close()
  button = document.createElement('button')
  button.textContent = 'Close'
  button.addEventListener 'click', => ...
  */

  var div = document.createElement('div');
  div.className = 'superpowers-error';
  div.appendChild(h1);
  // div.appendChild button
  document.body.appendChild(div);
}

export function onDisconnected() {
  document.body.innerHTML = '';

  var h1 = document.createElement('h1');
  h1.textContent = 'You were disconnected.';

  var button = document.createElement('button');
  button.textContent = 'Reconnect';
  button.addEventListener('click', () => { location.reload(); });

  var div = document.createElement('div');
  div.className = 'superpowers-error';
  div.appendChild(h1);
  div.appendChild(button);
  document.body.appendChild(div);
}

export function setupHotkeys() {
  document.addEventListener('keydown', (event) => {
    if (window.parent == null) return;

    // IE workaround for window.location.origin
    var origin = `${window.location.protocol}//${window.location.host}`

    if (event.keyCode === 79 && (event.ctrlKey || event.metaKey) && document.querySelector(".dialog") == null) { // CTRL-O
      event.preventDefault()
      window.parent.postMessage({ type: "hotkey", content: "searchEntry" }, origin);
    }

    if (event.keyCode === 87 && (event.ctrlKey || event.metaKey)) { // CTRL-W
      event.preventDefault()
      window.parent.postMessage({ type: "hotkey", content: "closeTab" }, origin);
    }

    if (event.keyCode === 9 && event.ctrlKey) { // CTRL-TAB
      event.preventDefault()
      if (event.shiftKey) window.parent.postMessage({ type: "hotkey", content: "previousTab" }, origin);
      else window.parent.postMessage({ type: "hotkey", content: "nextTab" }, origin);
    }

    if (event.keyCode === 116 || (event.keyCode === 80 && event.metaKey)) { // F5 || Cmd-P
      event.preventDefault()
      window.parent.postMessage({ type: "hotkey", content: "run" }, origin);
    }
    if (event.keyCode === 117 || (event.keyCode === 80 && event.metaKey && event.shiftKey)) { // F6 or Cmd-Shift-P
      event.preventDefault()
      window.parent.postMessage({ type: "hotkey", content: "debug" }, origin);
    }
  });
}

export function getTreeViewInsertionPoint(treeView: any) {
  var selectedElt = treeView.selectedNodes[0];
  var parentId: number;
  var index: number;

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
  var parentId: number;
  var index: number;

  var parentNode: any;
  var targetEntryId = dropInfo.target.dataset.id;

  switch (dropInfo.where) {
    case 'inside': {
      parentNode = treeById.byId[targetEntryId];
      index = parentNode.children.length;
    }
    case 'above':
    case 'below': {
      var targetNode = treeById.byId[targetEntryId];
      parentNode = treeById.parentNodesById[targetNode.id];

      index = (parentNode != null) ? parentNode.children.indexOf(targetNode) : treeById.pub.indexOf(targetNode);

      if (dropInfo.where === 'below') index++;
    }
  }

  if (parentNode != null) parentId = parentNode.id;
  return { parentId, index };
}

export function getListViewDropIndex(dropInfo: any, listById: SupCore.data.base.ListById) {
  var targetEntryId = dropInfo.target.dataset.id;
  var targetNode = listById.byId[targetEntryId];

  var index = listById.pub.indexOf(targetNode)
  if (dropInfo.where === 'below') index++;
  return index;
}

export function findEntryByPath(entries: any, path: string|string[]) {
  var parts = (typeof path === 'string') ? path.split('/') : path;
  var foundEntry: any;

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
