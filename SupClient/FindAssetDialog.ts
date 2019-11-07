/// <reference path="./typings/fuzzy.d.ts" />

import * as fuzzy from "fuzzy";
import * as TreeView from "dnd-tree-view";
import * as Dialogs from "simple-dialogs";
import * as i18n from "./i18n";

const maxResultsVisible = 100;
type FindAssetResult = string;

export default class FindAssetDialog extends Dialogs.BaseDialog<FindAssetResult> {
  private searchElt: HTMLInputElement;
  private treeView: TreeView;

  private entriesByPath: { [path: string]: SupCore.Data.EntryNode; } = {};
  private pathsList: string[] = [];
  private pathsWithoutSlashesList: string[] = [];
  private cachedElts: HTMLLIElement[] = [];
  private tooManyResultsElt: HTMLLIElement;

  constructor(private entries: SupCore.Data.Entries, private editorsByAssetType: { [assetType: string]: { pluginPath: string; } }, callback: (result: FindAssetResult) => void) {
    super(callback);

    this.dialogElt.classList.add("find-asset-dialog");

    const searchGroup = SupClient.html("div", "group", { parent: this.formElt, style: { display: "flex" } });
    this.searchElt = SupClient.html("input", {
      parent: searchGroup, type: "search",
      placeholder: i18n.t("common:searchPlaceholder"),
      style: { flex: "1 1 0" }
    }) as HTMLInputElement;
    this.searchElt.addEventListener("input", this.onSearchInput);
    this.searchElt.addEventListener("keydown", this.onSearchKeyDown);
    this.searchElt.focus();

    const treeViewContainer = SupClient.html("div", "assets-tree-view", { parent: this.formElt });
    this.treeView = new TreeView(treeViewContainer, { multipleSelection: false });
    this.treeView.on("activate", () => { this.submit(); });
    this.treeView.on("selectionChange", () => {
      if (this.treeView.selectedNodes[0] === this.tooManyResultsElt) this.treeView.clearSelection();
    });

    this.entries.walk((node: SupCore.Data.EntryNode) => {
      if (node.type == null || editorsByAssetType[node.type] == null) return;

      const path = this.entries.getPathFromId(node.id);
      this.entriesByPath[path] = node;
      this.pathsList.push(path);
      this.pathsWithoutSlashesList.push(path.replace(/\//g, " "));
    });

    for (let i = 0; i < maxResultsVisible; i++) {
      const liElt = SupClient.html("li");
      SupClient.html("img", { parent: liElt, draggable: false });
      SupClient.html("span", "name", { parent: liElt });

      this.cachedElts.push(liElt);
    }

    this.tooManyResultsElt = SupClient.html("li");
    SupClient.html("span", "name", { parent: this.tooManyResultsElt });
  }

  private onSearchInput = (event: UIEvent) => {
    this.treeView.clearSelection();
    this.treeView.treeRoot.innerHTML = "";

    const query = this.searchElt.value.trim();
    if (query === "") return;

    const duplicatedResults = fuzzy.filter(query.replace(/ /g, ""), this.pathsList);
    duplicatedResults.concat(fuzzy.filter(query, this.pathsWithoutSlashesList));

    // Increase score if exact match
    const caseInsensitiveQueryRegex = new RegExp(query, "i");
    duplicatedResults.forEach((x) => x.score += x.original.search(caseInsensitiveQueryRegex) !== -1 ? 100000 : 0);

    const resultScoresByIndex: { [index: number]: number } = {};
    for (const result of duplicatedResults) {
      const existingScore = resultScoresByIndex[result.index];
      resultScoresByIndex[result.index] = existingScore == null ? result.score : Math.max(result.score, existingScore);
    }

    const allResults: { index: number, score: number }[] = [];
    for (const index in resultScoresByIndex) allResults.push({ index: parseInt(index, 10), score: resultScoresByIndex[index] });
    allResults.sort((a, b) => b.score - a.score);

    const finalResults = allResults.length > maxResultsVisible ? allResults.slice(0, maxResultsVisible) : allResults;
    if (finalResults.length === 0) return;

    for (let i = 0; i < finalResults.length; i++) {
      const entryPath = this.pathsList[finalResults[i].index];
      const entry = this.entriesByPath[entryPath];

      const liElt = this.cachedElts[i];
      liElt.dataset["id"] = entry.id;
      liElt.querySelector("img").src = `/systems/${SupCore.system.id}/plugins/${this.editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;
      liElt.querySelector("span").textContent = this.entries.getPathFromId(entry.id);

      this.treeView.append(liElt, "item");
    }

    if (allResults.length > maxResultsVisible) {
      this.tooManyResultsElt.querySelector("span").textContent = `and ${allResults.length - maxResultsVisible} more results...`;
      this.treeView.append(this.tooManyResultsElt, "item");
    }

    this.treeView.addToSelection(this.cachedElts[0]);
    this.treeView.scrollIntoView(this.cachedElts[0]);
  }

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
  }

  submit() {
    if (this.treeView.selectedNodes.length === 0) return;
    super.submit(this.treeView.selectedNodes[0].dataset["id"]);
  }
}
