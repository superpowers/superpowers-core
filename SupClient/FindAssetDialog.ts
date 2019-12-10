/// <reference path="./typings/fuzzy.d.ts" />

import * as fuzzy from "fuzzy";
import * as TreeView from "dnd-tree-view";
import * as Dialogs from "simple-dialogs";
import * as i18n from "./i18n";

const maxResultsVisible = 100;
type FindAssetResult = string;

export default class FindAssetDialog extends Dialogs.BaseDialog<FindAssetResult> {
  private searchElt: HTMLInputElement;
  private filterContainer: HTMLDivElement;
  private treeView: TreeView;

  private entriesByPath: { [path: string]: SupCore.Data.EntryNode; };
  private pathsList: string[];
  private pathsWithoutSlashesList: string[];
  private cachedElts: HTMLLIElement[] = [];
  private tooManyResultsElt: HTMLLIElement;

  private searchTimeoutId: NodeJS.Timeout;

  constructor(private entries: SupCore.Data.Entries, private editorsByAssetType: { [assetType: string]: { pluginPath: string; } }, callback: (result: FindAssetResult) => void) {
    super(callback);

    this.dialogElt.classList.add("find-asset-dialog");

    const searchGroup = SupClient.html("div", "group", { parent: this.formElt, style: { display: "flex" } });
    this.searchElt = SupClient.html("input", {
      parent: searchGroup, type: "search",
      placeholder: i18n.t("common:findAsset.placeholder"),
      style: { flex: "1 1 0" }
    }) as HTMLInputElement;
    this.searchElt.addEventListener("input", () => this.scheduleSearch() );
    this.searchElt.addEventListener("keydown", this.onSearchKeyDown);
    this.searchElt.focus();

    const filterEnabled = Object.keys(this.editorsByAssetType).length > 1;

    if (filterEnabled) {
      this.filterContainer = SupClient.html("div", ["group", "filter-container"], { parent: this.formElt, style: { display: "flex" } });
      const toggleAllElt = SupClient.html("img", "toggle-all", { parent: this.filterContainer, draggable: false });
      toggleAllElt.addEventListener("click", this.onToggleAllFilterClick);

      for (const assetType in editorsByAssetType) {
        const iconElt = SupClient.html("img", { parent: this.filterContainer, dataset: { assetType }, draggable: false });
        iconElt.src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[assetType].pluginPath}/editors/${assetType}/icon.svg`;
        iconElt.addEventListener("click", this.onToggleAssetTypeFilterClick);
      }
    }

    const treeViewContainer = SupClient.html("div", "assets-tree-view", { parent: this.formElt });
    this.treeView = new TreeView(treeViewContainer, { multipleSelection: false });
    this.treeView.on("activate", () => { this.submit(); });
    this.treeView.on("selectionChange", () => {
      if (this.treeView.selectedNodes[0] === this.tooManyResultsElt) this.treeView.clearSelection();
    });

    for (let i = 0; i < maxResultsVisible; i++) {
      const liElt = SupClient.html("li");
      SupClient.html("img", { parent: liElt, draggable: false });
      SupClient.html("span", "name", { parent: liElt });

      this.cachedElts.push(liElt);
    }

    this.tooManyResultsElt = SupClient.html("li");
    SupClient.html("span", "name", { parent: this.tooManyResultsElt });

    this.parseEntries();
  }

  private parseEntries() {
    this.entriesByPath = {};
    this.pathsList = [];
    this.pathsWithoutSlashesList = [];

    const filterEnabled = Object.keys(this.editorsByAssetType).length > 1;

    this.entries.walk((node: SupCore.Data.EntryNode) => {
      if (node.type == null || this.editorsByAssetType[node.type] == null) return;
      if (filterEnabled && this.filterContainer.querySelector(`[data-asset-type='${node.type}']`).classList.contains("filtered")) return;

      const path = this.entries.getPathFromId(node.id);
      this.entriesByPath[path] = node;
      this.pathsList.push(path);
      this.pathsWithoutSlashesList.push(path.replace(/\//g, " "));
    });
  }

  private scheduleSearch() {
    this.treeView.clearSelection();
    this.treeView.treeRoot.innerHTML = "";

    this.tooManyResultsElt.querySelector("span").textContent = i18n.t("common:findAsset.searching");
    this.treeView.append(this.tooManyResultsElt, "item");

    if (this.searchTimeoutId != null) clearTimeout(this.searchTimeoutId);
    this.searchTimeoutId = setTimeout(this.searchResults, 150);
  }

  private searchResults = () => {
    this.searchTimeoutId = null;
    this.treeView.remove(this.tooManyResultsElt);

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
    if (finalResults.length === 0) {
      this.tooManyResultsElt.querySelector("span").textContent = i18n.t("common:findAsset.noResults");
      this.treeView.append(this.tooManyResultsElt, "item");
      return;
    }

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
      this.tooManyResultsElt.querySelector("span").textContent = i18n.t("common:findAsset.moreResults", { results: allResults.length - maxResultsVisible });
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

  private onToggleAllFilterClick = () => {
    const enableAllFilters = !(this.filterContainer.querySelector(".toggle-all") as HTMLElement).classList.contains("filtered");
    const filterElts = this.filterContainer.querySelectorAll("img") as any as HTMLImageElement[];

    for (const filterElt of filterElts) filterElt.classList.toggle("filtered", enableAllFilters);

    this.parseEntries();
    this.scheduleSearch();
  }

  private onToggleAssetTypeFilterClick = (event: KeyboardEvent) => {
    const filterElt = event.target as HTMLElement;
    filterElt.classList.toggle("filtered");

    let allAssetTypesFiltered = true;
    for (const assetType in this.editorsByAssetType) {
      const filtered = this.filterContainer.querySelector(`[data-asset-type='${assetType}']`).classList.contains("filtered");
      if (!filtered) { allAssetTypesFiltered = false; break; }
    }

    this.filterContainer.querySelector(`.toggle-all`).classList.toggle("filtered", allAssetTypesFiltered);

    this.parseEntries();
    this.scheduleSearch();
  }

  submit() {
    if (this.treeView.selectedNodes.length === 0) return;
    super.submit(this.treeView.selectedNodes[0].dataset["id"]);
  }
}
