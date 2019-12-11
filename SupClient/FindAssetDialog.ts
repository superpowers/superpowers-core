
import * as fuzzysort from "fuzzysort";
import * as TreeView from "dnd-tree-view";
import * as Dialogs from "simple-dialogs";
import * as i18n from "./i18n";

const maxResultsVisible = 100;
type FindAssetResult = string;

type FuzzyEntry = {
  id: string;
  type: string;
  path: Fuzzysort.Prepared;
};

export default class FindAssetDialog extends Dialogs.BaseDialog<FindAssetResult> {
  private searchElt: HTMLInputElement;
  private filterContainer: HTMLDivElement;
  private treeView: TreeView;

  private fuzzyEntries: FuzzyEntry[];
  private cachedElts: HTMLLIElement[] = [];
  private tooManyResultsElt: HTMLLIElement;

  constructor(private entries: SupCore.Data.Entries, private editorsByAssetType: { [assetType: string]: { pluginPath: string; } }, callback: (result: FindAssetResult) => void) {
    super(callback);

    this.dialogElt.classList.add("find-asset-dialog");

    const searchGroup = SupClient.html("div", "group", { parent: this.formElt, style: { display: "flex" } });
    this.searchElt = SupClient.html("input", {
      parent: searchGroup, type: "search",
      placeholder: i18n.t("common:findAsset.placeholder"),
      style: { flex: "1 1 0" }
    }) as HTMLInputElement;
    this.searchElt.addEventListener("input", () => this.searchResults() );
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
    this.fuzzyEntries = [];

    const filterEnabled = Object.keys(this.editorsByAssetType).length > 1;

    this.entries.walk((node: SupCore.Data.EntryNode) => {
      if (node.type == null || this.editorsByAssetType[node.type] == null) return;
      if (filterEnabled && this.filterContainer.querySelector(`[data-asset-type='${node.type}']`).classList.contains("filtered")) return;

      const path = this.entries.getPathFromId(node.id);
      this.fuzzyEntries.push({ id: node.id, type: node.type, path: fuzzysort.prepare(path) });
    });
  }

  private searchResults() {
    this.treeView.clearSelection();
    this.treeView.treeRoot.innerHTML = "";

    const query = this.searchElt.value.replace(/ /g, "");
    if (query === "") return;

    const options: Fuzzysort.KeyOptions = { allowTypo: true, threshold: -100000, key: "path" };
    const results = fuzzysort.go<FuzzyEntry>(query, this.fuzzyEntries, options);

    if (results.length === 0) {
      this.tooManyResultsElt.querySelector("span").textContent = i18n.t("common:findAsset.noResults");
      this.treeView.append(this.tooManyResultsElt, "item");
      return;
    }

    for (let i = 0; i < Math.min(results.length, maxResultsVisible); i++) {
      const result = results[i];

      const liElt = this.cachedElts[i];
      liElt.dataset["id"] = result.obj.id;
      liElt.querySelector("img").src = `/systems/${SupCore.system.id}/plugins/${this.editorsByAssetType[result.obj.type].pluginPath}/editors/${result.obj.type}/icon.svg`;
      liElt.querySelector("span").innerHTML = fuzzysort.highlight(result, "<b>", "</b>");

      this.treeView.append(liElt, "item");
    }

    if (results.length > maxResultsVisible) {
      this.tooManyResultsElt.querySelector("span").textContent = i18n.t("common:findAsset.moreResults", { results: results.length - maxResultsVisible });
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
    this.searchResults();
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
    this.searchResults();
  }

  submit() {
    if (this.treeView.selectedNodes.length === 0) return;
    super.submit(this.treeView.selectedNodes[0].dataset["id"]);
  }
}
