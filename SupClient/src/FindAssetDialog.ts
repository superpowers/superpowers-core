/// <reference path="../typings/fuzzy.d.ts" />

import * as fuzzy from "fuzzy";
import * as TreeView from "dnd-tree-view";
import * as Dialogs from "simple-dialogs";
import * as i18n from "./i18n";
import html from "./html";

type FindAssetResult = string;

export default class FindAssetDialog extends Dialogs.BaseDialog<FindAssetResult> {
  private searchElt: HTMLInputElement;
  private treeView: TreeView;

  private entriesByPath: { [path: string]: SupCore.Data.EntryNode; } = {};
  private pathsList: string[] = [];
  private pathsWithoutSlashesList: string[] = [];
  private entryElts: HTMLLIElement[] = [];

  constructor(private entries: SupCore.Data.Entries, private editorsByAssetType: { [assetType: string]: { pluginPath: string; } }, callback: (result: FindAssetResult) => void) {
    super(callback);

    this.dialogElt.classList.add("find-asset-dialog");

    const searchGroup = html("div", "group", { parent: this.formElt, style: { display: "flex" } });
    this.searchElt = html("input", {
      parent: searchGroup, type: "search",
      placeholder: i18n.t("common:searchPlaceholder"),
      style: { flex: "1 1 0" }
    }) as HTMLInputElement;
    this.searchElt.addEventListener("input", this.onSearchInput);
    this.searchElt.addEventListener("keydown", this.onSearchKeyDown);
    this.searchElt.focus();

    const treeViewContainer = html("div", "assets-tree-view", { parent: this.formElt });
    this.treeView = new TreeView(treeViewContainer, { multipleSelection: false });
    this.treeView.on("activate", () => { this.submit(); });

    this.entries.walk((node: SupCore.Data.EntryNode) => {
      if (node.type == null || editorsByAssetType[node.type] == null) return;

      const path = this.entries.getPathFromId(node.id);
      this.entriesByPath[path] = node;
      this.pathsList.push(path);
      this.pathsWithoutSlashesList.push(path.replace(/\//g, " "));

      const liElt = this.createEntryElement(node);
      this.entryElts.push(liElt);
      this.treeView.append(liElt, "item");
    });

    this.treeView.addToSelection(this.treeView.treeRoot.firstChild as HTMLLIElement);
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

    this.treeView.clearSelection();
    this.treeView.treeRoot.innerHTML = "";
    if (results.length === 0) return;

    results.sort((a, b) => b.score - a.score);
    let index = results.length - 1;
    for (let i = 0; i < results.length; i++) {
      const result = results[index];

      if (result.original.search(new RegExp(this.searchElt.value, "i")) !== -1) {
        results.splice(index, 1);
        results.unshift(result);
      } else {
        index -= 1;
      }
    }

    for (const result of results) {
      const liElt = this.entryElts[result.index];
      this.treeView.append(liElt, "item");
    }

    this.treeView.addToSelection(this.treeView.treeRoot.firstChild as HTMLLIElement);
  };

  private onSearchKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 38 /* Up */) {
      event.stopPropagation();
      event.preventDefault();
      this.treeView.moveVertically(-1);
    } else if (event.keyCode === 40 /* Down */) {
      event.stopPropagation();
      event.preventDefault();
      this.treeView.moveVertically(1);
    }
  };

  submit() {
    if (this.treeView.selectedNodes.length === 0) return;
    super.submit(this.treeView.selectedNodes[0].dataset["id"]);
  }
}
