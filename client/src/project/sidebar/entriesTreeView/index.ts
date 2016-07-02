import * as TreeView from "dnd-tree-view";

import { socket, entries } from "../../network";
import * as tabsAssets from "../../tabs/assets";
import * as sidebar from "../";
import {
  onNewAssetClick, onNewFolderClick, onRenameEntryClick, onDuplicateEntryClick, onTrashEntryClick,
  onSearchEntryDialog, setupFilterStrip, onToggleFilterStripClick
} from "./buttonCallbacks";

export let widget: TreeView;

export function start() {
  widget = new TreeView(document.querySelector(".entries-tree-view") as HTMLElement, { dragStartCallback: onEntryDragStart, dropCallback: onTreeViewDrop });
  widget.on("selectionChange", updateSelectedEntry);
  widget.on("activate", onEntryActivate);

  document.querySelector(".entries-buttons .new-asset").addEventListener("click", onNewAssetClick);
  document.querySelector(".entries-buttons .new-folder").addEventListener("click", onNewFolderClick);
  document.querySelector(".entries-buttons .search").addEventListener("click", onSearchEntryDialog);
  document.querySelector(".entries-buttons .rename-entry").addEventListener("click", onRenameEntryClick);
  document.querySelector(".entries-buttons .duplicate-entry").addEventListener("click", onDuplicateEntryClick);
  document.querySelector(".entries-buttons .trash-entry").addEventListener("click", onTrashEntryClick);
  document.querySelector(".entries-buttons .filter").addEventListener("click", onToggleFilterStripClick);

  sidebar.openInNewWindowButton.addEventListener("click", onOpenInNewWindowClick);

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
}

export function enable() {
  (document.querySelector(".entries-buttons .new-asset") as HTMLButtonElement).disabled = false;
  (document.querySelector(".entries-buttons .new-folder") as HTMLButtonElement).disabled = false;
  (document.querySelector(".entries-buttons .search") as HTMLButtonElement).disabled = false;
  (document.querySelector(".entries-buttons .filter") as HTMLButtonElement).disabled = false;
  (document.querySelector(".filter-buttons") as HTMLButtonElement).hidden = true;

  (document.querySelector(".entries-tree-view .tree-loading") as HTMLDivElement).hidden = true;

  function walk(entry: SupCore.Data.EntryNode, parentEntry: SupCore.Data.EntryNode, parentElt: HTMLLIElement) {
    const liElt = createEntryElement(entry);
    liElt.classList.add("collapsed");

    const nodeType: "item"|"group" = (entry.children != null) ? "group" : "item";
    widget.append(liElt, nodeType, parentElt);

    if (entry.children != null) for (const child of entry.children) walk(child, entry, liElt);
  }
  for (const entry of entries.pub) walk(entry, null, null);

  setupFilterStrip();
}

export function disable() {
  widget.clear();

  (document.querySelector(".entries-buttons .new-asset") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .new-folder") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .search") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .rename-entry") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .duplicate-entry") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .trash-entry") as HTMLButtonElement).disabled = true;
  (document.querySelector(".entries-buttons .filter") as HTMLButtonElement).disabled = true;
  (document.querySelector(".filter-buttons") as HTMLDivElement).hidden = true;

  (document.querySelector(".entries-tree-view .tree-loading") as HTMLDivElement).hidden = false;
}

export function createEntryElement(entry: SupCore.Data.EntryNode) {
  const liElt = SupClient.html("li", { dataset: { id: entry.id } });

  const parentEntry = entries.parentNodesById[entry.id];
  if (parentEntry != null) liElt.dataset["parentId"] = parentEntry.id;

  if (entry.type != null) {
    liElt.dataset["assetType"] = entry.type;

    const iconElt = SupClient.html("img", { parent: liElt, draggable: false });
    iconElt.src = `/systems/${SupCore.system.id}/plugins/${tabsAssets.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
  }

  SupClient.html("span", "name", { parent: liElt, textContent: entry.name });

  if (entry.type != null) {
    const badgesSpan = SupClient.html("span", "badges", { parent: liElt });
    for (const badge of entry.badges) SupClient.html("span", badge.id, { parent: badgesSpan, textContent: SupClient.i18n.t(`badges:${badge.id}`) });

    liElt.addEventListener("mouseenter", (event) => { liElt.appendChild(sidebar.openInNewWindowButton); });
    liElt.addEventListener("mouseleave", (event) => {
      if (sidebar.openInNewWindowButton.parentElement != null) sidebar.openInNewWindowButton.parentElement.removeChild(sidebar.openInNewWindowButton);
    });

  } else {
    const childrenElt = SupClient.html("span", "children", { parent: liElt, textContent: `(${entry.children.length})`, style: { display: "none"} });

    liElt.addEventListener("mouseenter", (event) => { childrenElt.style.display = ""; });
    liElt.addEventListener("mouseleave", (event) => { childrenElt.style.display = "none"; });
  }

  return liElt;
}

function onEntryDragStart(event: DragEvent, entryElt: HTMLLIElement) {
  const id = entryElt.dataset["id"];
  event.dataTransfer.setData("text/plain", entries.getPathFromId(id));

  const entryIds = [ id ];
  for (const node of widget.selectedNodes) {
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
      if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }
    });
    if (!sameParent || sourceChildren.indexOf(entries.byId[id]) >= dropPoint.index) i++;
  }
  return false;
}

export function updateSelectedEntry() {
  const allButtons = document.querySelectorAll(".entries-buttons button.edit");
  for (let index = 0; index < allButtons.length; index++) {
    const button = allButtons.item(index) as HTMLButtonElement;
    button.disabled = widget.selectedNodes.length === 0 || (button.classList.contains("single") && widget.selectedNodes.length !== 1);
  }
}

export function scrollEntryIntoView(entryId: string) {
  const entryElt = widget.treeRoot.querySelector(`[data-id='${entryId}']`) as HTMLLIElement;
  widget.clearSelection();
  widget.scrollIntoView(entryElt);
  widget.addToSelection(entryElt);
}

function onEntryActivate() {
  const activatedEntry = widget.selectedNodes[0];
  tabsAssets.open(activatedEntry.dataset["id"]);
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
