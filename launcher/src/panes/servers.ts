let TreeView = require("dnd-tree-view");
import * as dialogs from "../../../SupClient/src/dialogs/index";
import * as config from "../config";

let serversTreeView = new TreeView(document.querySelector(".servers-tree-view"));
export { serversTreeView };

function start() {
  for (let serverEntry of config.serverEntries) {
    let liElt = createServerElement(serverEntry);
    serversTreeView.append(liElt, "item");
  }

  serversTreeView.on("activate", onServerActivate);

  document.querySelector(".servers .buttons .add-server").addEventListener("click", onAddServerClick);
  document.querySelector(".servers .buttons .rename-server").addEventListener("click", onRenameServerClick);
  document.querySelector(".servers .buttons .edit-address").addEventListener("click", onEditAddressClick);
  document.querySelector(".servers .buttons .remove-server").addEventListener("click", onRemoveAddressClick);
}

function createServerElement(entry: { name: string; address: string; }) {
  let liElt = <HTMLLIElement>document.createElement("li");
  (<any>liElt.dataset).name = entry.name;
  (<any>liElt.dataset).address = entry.address;

  let nameSpan = <HTMLSpanElement>document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = entry.name;
  liElt.appendChild(nameSpan);

  let addressSpan = document.createElement("span");
  addressSpan.className = "address";
  addressSpan.textContent = entry.address;
  liElt.appendChild(addressSpan);

  return liElt;
}

function onAddServerClick() {
  dialogs.prompt("Enter a name for the server.", "Enter a name", null, "Add server", (name: string) => {
    if (name == null) return;

    dialogs.prompt("Enter the server address.", null, "127.0.0.1", "Add server", (address: string) => {
      if (address == null) return;

      let liElt = createServerElement({ name, address });
      serversTreeView.append(liElt, "item");
    });
  });
}

function onRenameServerClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  let node = serversTreeView.selectedNodes[0];

  dialogs.prompt("Enter a new name for the server.", null, node.dataset.name, "Rename", (name: string) => {
    if (name == null) return;
    node.dataset.name = name;
    node.querySelector(".name").textContent = name;
  });
}

function onEditAddressClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  let node = serversTreeView.selectedNodes[0];

  dialogs.prompt("Enter the new server address.", null, node.dataset.address, "Update", (address: string) => {
    if (address == null) return;
    node.dataset.address = address;
    node.querySelector(".address").textContent = address;
 });
}

function onRemoveAddressClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  let node = serversTreeView.selectedNodes[0];

  dialogs.confirm(`Do you want to delete the server ${node.dataset.name}?`, "Delete", (confirm: boolean) => {
    if (!confirm) return;

    node.parentElement.removeChild(node);
 });
}

function onServerActivate() {
  let gui = (<any>window).nwDispatcher.requireNwGui();
  gui.Window.open(`http://${serversTreeView.selectedNodes[0].dataset.address}`,
    { title: "Superpowers", icon: "icon.png",
    width: 1000, height: 600,
    min_width: 800, min_height: 480,
    toolbar: false, frame: false, focus: true });
}

start();
