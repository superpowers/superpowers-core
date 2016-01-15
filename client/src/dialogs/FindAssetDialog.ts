/// <reference path="./fuzzy.d.ts" />

import * as fuzzy from "fuzzy";

/* tslint:disable */
const TreeView = require("dnd-tree-view");
/* tslint:enable */

export default class FindAssetDialog extends SupClient.dialogs.BaseDialog {
  private searchElt: HTMLInputElement;
  private treeView: any;

  private entriesByPath: { [path: string]: SupCore.Data.EntryNode; } = {};
  private pathsList: string[] = [];
  private pathsWithoutSlashesList: string[] = [];
  private entryElts: HTMLLIElement[] = [];

  constructor(private entries: SupCore.Data.Entries, private editorsByAssetType: { [assetType: string]: { pluginPath: string; } }, private callback: (value: string) => any) {
    super();

    this.dialogElt.classList.add("find-asset-dialog");

    this.searchElt = document.createElement("input");
    this.searchElt.type = "search";
    this.searchElt.placeholder = SupClient.i18n.t("project:treeView.searchPlaceholder");
    this.formElt.appendChild(this.searchElt);
    this.searchElt.addEventListener("input", this.onSearchInput);

    const treeViewContainer = document.createElement("div");
    treeViewContainer.className = "assets-tree-view";
    this.formElt.appendChild(treeViewContainer);

    this.treeView = new TreeView(treeViewContainer, { multipleSelection: false });
    this.treeView.on("activate", () => { this.submit(); });

    this.entries.walk((node: SupCore.Data.EntryNode) => {
      if (node.type == null) return;

      const path = this.entries.getPathFromId(node.id);
      this.entriesByPath[path] = node;
      this.pathsList.push(path);
      this.pathsWithoutSlashesList.push(path.replace(/\//g, " "));

      const liElt = this.createEntryElement(node);
      this.entryElts.push(liElt);
      this.treeView.append(liElt, "item");
    });

    this.treeView.addToSelection(this.treeView.treeRoot.firstChild);

    this.searchElt.addEventListener("keydown", this.onSearchKeyDown);
    this.searchElt.focus();
  }

  private createEntryElement(entry: SupCore.Data.EntryNode) {
    const liElt = document.createElement("li");
    liElt.dataset["id"] = entry.id;

    const iconElt = document.createElement("img");
    iconElt.draggable = false;
    iconElt.src = `/systems/${SupCore.system.id}/plugins/${this.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
    liElt.appendChild(iconElt);

    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = this.entries.getPathFromId(entry.id);
    liElt.appendChild(nameSpan);

    return liElt;
  }

  private onSearchInput = (event: UIEvent) => {
    let results = fuzzy.filter(this.searchElt.value, this.pathsList);
    const resultsWithoutSlashes = fuzzy.filter(this.searchElt.value, this.pathsWithoutSlashesList);
    results = results.concat(resultsWithoutSlashes);
    results.sort((a, b) => b.score - a.score);

    this.treeView.clearSelection();
    this.treeView.treeRoot.innerHTML = "";
    if (results.length === 0) return;

    for (const result of results) {
      const liElt = this.entryElts[result.index];
      this.treeView.append(liElt, "item");
    }

    this.treeView.addToSelection(this.treeView.treeRoot.firstChild);
  };

  private onSearchKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 38 /* Up */) {
      event.stopPropagation();
      event.preventDefault();
      this.treeView._moveVertically(-1);
    } else if (event.keyCode === 40 /* Down */) {
      event.stopPropagation();
      event.preventDefault();
      this.treeView._moveVertically(1);
    }
  };

  submit() {
    if (this.treeView.selectedNodes.length === 0) return false;
    if (!super.submit()) return false;
    this.callback(this.treeView.selectedNodes[0].dataset["id"]);
    return true;
  }

  cancel() {
    super.cancel();
    this.callback(null);
  }
}
