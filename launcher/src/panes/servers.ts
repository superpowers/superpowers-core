import * as TreeView from "dnd-tree-view";
import * as dialogs from "simple-dialogs";
import * as config from "../config";

const serversTreeView = new TreeView(document.querySelector(".servers-tree-view") as HTMLElement, { multipleSelection: false });
export { serversTreeView };

function start() {
  for (const serverEntry of config.serverEntries) {
    const liElt = createServerElement(serverEntry);
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
  const liElt = document.createElement("li") as HTMLLIElement;
  liElt.dataset["name"] = entry.name;
  liElt.dataset["address"] = entry.address;

  const nameSpan = document.createElement("span") as HTMLSpanElement;
  nameSpan.className = "name";
  nameSpan.textContent = entry.name;
  liElt.appendChild(nameSpan);

  const addressSpan = document.createElement("span");
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
    new dialogs.PromptDialog("Enter the server address.", { initialValue: "127.0.0.1:4237", validationLabel: "Add server" }, (address: string) => {
      /* tslint:enable:no-unused-expression */
      if (address == null) return;

      const liElt = createServerElement({ name, address });
      serversTreeView.append(liElt, "item");
    });
  });
}

function onRenameServerClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  const node = serversTreeView.selectedNodes[0];

  /* tslint:disable:no-unused-expression */
  new dialogs.PromptDialog("Enter a new name for the server.", { initialValue: node.dataset["name"], validationLabel: "Rename" }, (name: string) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;
    node.dataset["name"] = name;
    node.querySelector(".name").textContent = name;
  });
}

function onEditAddressClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  const node = serversTreeView.selectedNodes[0];

  /* tslint:disable:no-unused-expression */
  new dialogs.PromptDialog("Enter the new server address.", { initialValue: node.dataset["address"], validationLabel: "Update" }, (address: string) => {
    /* tslint:enable:no-unused-expression */
    if (address == null) return;
    node.dataset["address"] = address;
    node.querySelector(".address").textContent = address;
 });
}

function onRemoveAddressClick() {
  if (serversTreeView.selectedNodes.length !== 1) return;

  const node = serversTreeView.selectedNodes[0];

  /* tslint:disable:no-unused-expression */
  new dialogs.ConfirmDialog(`Do you want to delete the server ${node.dataset["name"]}?`, { validationLabel: "Delete" }, (confirmed: boolean) => {
    /* tslint:enable:no-unused-expression */
    if (!confirmed) return;

    node.parentElement.removeChild(node);
 });
}

function onSelectionChange() {
  const noServerSelected = serversTreeView.selectedNodes.length === 0;
  (document.querySelector(".servers .buttons .rename-server") as HTMLButtonElement).disabled = noServerSelected;
  (document.querySelector(".servers .buttons .edit-address") as HTMLButtonElement).disabled = noServerSelected;
  (document.querySelector(".servers .buttons .remove-server") as HTMLButtonElement).disabled = noServerSelected;
}

const ipcRenderer: GitHubElectron.IpcRenderer = nodeRequire("electron").ipcRenderer;
function onServerActivate() {
  const address = serversTreeView.selectedNodes[0].dataset["address"];
  ipcRenderer.send("new-server-window", address);
}

start();
