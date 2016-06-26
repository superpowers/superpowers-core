import { socket, entries } from "../../network";
import * as tabsAssets from "../../tabs/assets";
import * as entriesTreeView from "./";
import CreateAssetDialog from "./CreateAssetDialog";

let autoOpenAsset = true;
function onEntryAddedAck(err: string, id: string) {
  if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }

  entriesTreeView.widget.clearSelection();
  let entry = entriesTreeView.widget.treeRoot.querySelector(`li[data-id='${id}']`) as HTMLLIElement;
  entriesTreeView.widget.addToSelection(entry);
  entriesTreeView.updateSelectedEntry();

  if (autoOpenAsset) tabsAssets.open(id);
  if (entries.byId[id].type == null) entry.classList.remove("collapsed");
}

export function onNewAssetClick() {
  new CreateAssetDialog(autoOpenAsset, (result) => {
    if (result == null) return;

    if (result.name === "")
      result.name = SupClient.i18n.t(`${tabsAssets.editorsByAssetType[result.type].pluginPath}:editors.${result.type}.title`);

    autoOpenAsset = result.open;
    socket.emit("add:entries", result.name, result.type, SupClient.getTreeViewInsertionPoint(entriesTreeView.widget), onEntryAddedAck);
  });
}

export function onNewFolderClick() {
  const options = {
    placeholder: SupClient.i18n.t("project:treeView.newFolder.placeholder"),
    initialValue: SupClient.i18n.t("project:treeView.newFolder.initialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("project:treeView.newFolder.prompt"), options, (name) => {
    if (name == null) return;

    socket.emit("add:entries", name, null, SupClient.getTreeViewInsertionPoint(entriesTreeView.widget), onEntryAddedAck);
  });
}

export function onRenameEntryClick() {
  if (entriesTreeView.widget.selectedNodes.length !== 1) return;

  const selectedNode = entriesTreeView.widget.selectedNodes[0];
  const entry = entries.byId[selectedNode.dataset["id"]];

  const options = {
    initialValue: entry.name,
    validationLabel: SupClient.i18n.t("common:actions.rename"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("project:treeView.renamePrompt"), options, (newName) => {
    if (newName == null || newName === entry.name) return;

    socket.emit("setProperty:entries", entry.id, "name", newName, (err: string) => {
      if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }
    });
  });
}

export function onDuplicateEntryClick() {
  if (entriesTreeView.widget.selectedNodes.length !== 1) return;

  const selectedNode = entriesTreeView.widget.selectedNodes[0];
  const entry = entries.byId[selectedNode.dataset["id"]];
  if (entry.type == null) return;

  const options = {
    initialValue: entry.name,
    validationLabel: SupClient.i18n.t("common:actions.duplicate"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("project:treeView.duplicatePrompt"), options, (newName) => {
    if (newName == null) return;

    socket.emit("duplicate:entries", newName, entry.id, SupClient.getTreeViewInsertionPoint(entriesTreeView.widget), onEntryAddedAck);
  });
}

export function onTrashEntryClick() {
  if (entriesTreeView.widget.selectedNodes.length === 0) return;

  const selectedEntries: SupCore.Data.EntryNode[] = [];

  function checkNextEntry() {
    selectedEntries.splice(0, 1);
    if (selectedEntries.length === 0) {
      const confirmLabel = SupClient.i18n.t("project:treeView.trash.prompt");
      const validationLabel = SupClient.i18n.t("project:treeView.trash.title");

      new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
        if (!confirm) return;

        for (const selectedNode of entriesTreeView.widget.selectedNodes) {
          const entry = entries.byId[selectedNode.dataset["id"]];
          socket.emit("trash:entries", entry.id, (err: string) => {
            if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }
          });
        }
        entriesTreeView.widget.clearSelection();
      });

    } else warnBrokenDependency(selectedEntries[0]);
  }

  function warnBrokenDependency(entry: SupCore.Data.EntryNode) {
    if (entry.type == null) for (const entryChild of entry.children) selectedEntries.push(entryChild);

    if (entry.dependentAssetIds != null && entry.dependentAssetIds.length > 0) {
      const dependentAssetNames: string[] = [];
      for (const usingId of entry.dependentAssetIds) dependentAssetNames.push(entries.getPathFromId(usingId));
      const infoLabel = SupClient.i18n.t("project:treeView.trash.warnBrokenDependency", {
        entryName: entries.getPathFromId(entry.id), dependentEntryNames: dependentAssetNames.join(", ")
      });
      new SupClient.Dialogs.InfoDialog(infoLabel, null, () => { checkNextEntry(); });
    } else checkNextEntry();
  }

  for (const selectedNode of entriesTreeView.widget.selectedNodes) selectedEntries.push(entries.byId[selectedNode.dataset["id"]]);
  warnBrokenDependency(selectedEntries[0]);
}

const entriesFilterStrip = (document.querySelector(".filter-buttons") as HTMLElement);
export function setupFilterStrip() {
  const filterElt = entriesFilterStrip;
  filterElt.innerHTML = "";

  const toggleAllElt = SupClient.html("img", "toggle-all", { parent: filterElt, draggable: false });
  toggleAllElt.addEventListener("click", onToggleAllFilterClick);

  for (const assetType of tabsAssets.assetTypes) {
    const iconElt = SupClient.html("img", { parent: filterElt, dataset: { assetType }, draggable: false });
    iconElt.src = `/systems/${SupCore.system.id}/plugins/${tabsAssets.editorsByAssetType[assetType].pluginPath}/editors/${assetType}/icon.svg`;
    iconElt.addEventListener("click", onToggleAssetTypeFilterClick);
  }
}

function onToggleAssetTypeFilterClick(event: MouseEvent) {
  const filterElt = event.target as HTMLElement;
  const filtered = filterElt.classList.toggle("filtered");

  const assetType = filterElt.dataset["assetType"];
  const entryElts = (entriesTreeView.widget.treeRoot.querySelectorAll(`[data-asset-type='${assetType}']`) as any as HTMLElement[]);

  for (const entryElt of entryElts) entryElt.hidden = filtered;

  let allAssetTypesFiltered = true;
  for (const assetType of tabsAssets.assetTypes) {
    const filtered = entriesFilterStrip.querySelector(`[data-asset-type='${assetType}']`).classList.contains("filtered");
    if (!filtered) { allAssetTypesFiltered = false; break; }
  }

  entriesFilterStrip.querySelector(`.toggle-all`).classList.toggle("filtered", allAssetTypesFiltered);
}

function onToggleAllFilterClick() {
  const enableAllFilters = !(entriesFilterStrip.querySelector(".toggle-all") as HTMLElement).classList.contains("filtered");
  const filterElts = entriesFilterStrip.querySelectorAll("img") as any as HTMLImageElement[];

  for (const filterElt of filterElts) {
    filterElt.classList.toggle("filtered", enableAllFilters);

    const assetType = filterElt.dataset["assetType"];
    const entryElts = entriesTreeView.widget.treeRoot.querySelectorAll(`[data-asset-type='${assetType}']`) as any as HTMLElement[];
    for (const entryElt of entryElts) entryElt.hidden = enableAllFilters;
  }
}

export function onToggleFilterStripClick() {
  entriesFilterStrip.hidden = !entriesFilterStrip.hidden;

  if (entriesFilterStrip.hidden) {
    const hiddenEntryElts = entriesTreeView.widget.treeRoot.querySelectorAll("li.item[hidden]") as any as HTMLLIElement[];
    for (const hiddenEntryElt of hiddenEntryElts) hiddenEntryElt.hidden = false;
  } else {
    for (const assetType of tabsAssets.assetTypes) {
      const filtered = entriesFilterStrip.querySelector(`[data-asset-type='${assetType}']`).classList.contains("filtered");
      const entryElts = (entriesTreeView.widget.treeRoot.querySelectorAll(`[data-asset-type='${assetType}']`) as any as HTMLElement[]);
      for (const entryElt of entryElts) entryElt.hidden = filtered;
    }
  }
}

export function onSearchEntryDialog() {
  if (entries == null) return;

  new SupClient.Dialogs.FindAssetDialog(entries, tabsAssets.editorsByAssetType, (entryId) => {
    if (entryId == null) return;
    tabsAssets.open(entryId);

    entriesTreeView.widget.clearSelection();
    const entryElt = entriesTreeView.widget.treeRoot.querySelector(`[data-id='${entryId}']`) as HTMLLIElement;
    entriesTreeView.widget.addToSelection(entryElt);
    entriesTreeView.widget.scrollIntoView(entryElt);
  });
}
