/* tslint:disable */
let TreeView = require("dnd-tree-view");
/* tslint:enable */
import * as dialogs from "../../../SupClient/src/dialogs/index";
import * as config from "../config";

let serversTreeView = new TreeView(document.querySelector(".servers-tree-view"), { multipleSelection: false });
export { serversTreeView };

function start() {
  for (let serverEntry of config.serverEntries) {
    let liElt = createServerElement(serverEntry);
    serversTreeView.append(liElt, "item");
  }

  serversTreeView.on("selectionChange", onSelectionChange);
  serversTreeView.on("activate", onServerActivate);

  document.querySelector(".servers .buttons .add-server").addEventListener("click", onAddServerClick);
  document.querySelector(".servers .buttons .rename-server").addEventListener("click", onRenameServerClick);
  document.querySelector(".servers .buttons .edit-address").addEventListener("click", onEditAddressClick);
  document.querySelector(".servers .buttons .remove-server").addEventListener("click", onRemoveAddressClick);
}

function createServerElement(entry: { name: string; address: string; }) {
  let liElt = <HTMLLIElement>document.createElement("li");
  liElt.dataset["name"] = entry.name;
  liElt.dataset["address"] = entry.address;

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
  /* tslint:disable:no-unused-expression */
  new dialogs.PromptDialog("Enter a name for the server.", { placeholder: "Enter a name", validationLabel: "Add server" }, (name: string) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;

    /* tslint:disable:no-unused-expression */
    new dialogs.PromptDialog("Enter the server address.", { initialValue: "127.0.0.1", validationLabel: "Add server" }, (address: string) => {
      /* tslint:enable:no-unused-expression */
      if (address == null) return;

      let liElt = createServerElement({ name, address });
      serversTreeView.append(liElt, "item");
    });
  });
}

function onRenameServerClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  let node = serversTreeView.selectedNodes[0];

  /* tslint:disable:no-unused-expression */
  new dialogs.PromptDialog("Enter a new name for the server.", { initialValue: node.dataset.name, validationLabel: "Rename" }, (name: string) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;
    node.dataset.name = name;
    node.querySelector(".name").textContent = name;
  });
}

function onEditAddressClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  let node = serversTreeView.selectedNodes[0];

  /* tslint:disable:no-unused-expression */
  new dialogs.PromptDialog("Enter the new server address.", { initialValue: node.dataset.address, validationLabel: "Update" }, (address: string) => {
    /* tslint:enable:no-unused-expression */
    if (address == null) return;
    node.dataset.address = address;
    node.querySelector(".address").textContent = address;
 });
}

function onRemoveAddressClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  let node = serversTreeView.selectedNodes[0];

  /* tslint:disable:no-unused-expression */
  new dialogs.ConfirmDialog(`Do you want to delete the server ${node.dataset.name}?`, "Delete", (confirmed: boolean) => {
    /* tslint:enable:no-unused-expression */
    if (!confirmed) return;

    node.parentElement.removeChild(node);
 });
}

function onSelectionChange() {
  let noServerSelected = serversTreeView.selectedNodes.length === 0;
  (document.querySelector(".servers .buttons .rename-server") as HTMLButtonElement).disabled = noServerSelected;
  (document.querySelector(".servers .buttons .edit-address") as HTMLButtonElement).disabled = noServerSelected;
  (document.querySelector(".servers .buttons .remove-server") as HTMLButtonElement).disabled = noServerSelected;
}

let ipc: GitHubElectron.InProcess = nodeRequire("ipc");
function onServerActivate() {
  let address = serversTreeView.selectedNodes[0].dataset.address;
  ipc.send("new-server-window", address);
}

start();
