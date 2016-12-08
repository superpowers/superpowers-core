import * as TreeView from "dnd-tree-view";
import { assetTypes, editorsByAssetType } from "../../tabs/assets";

type CreateAssetResult = { name: string; type: string; open: boolean; };

export default class CreateAssetDialog extends SupClient.Dialogs.BaseDialog<CreateAssetResult> {
  private treeView: TreeView;
  private nameInputElt: HTMLInputElement;
  private openCheckboxElt: HTMLInputElement;

  private selectedAssetType: string;

  constructor(open: boolean, callback: (result: CreateAssetResult) => void) {
    super(callback);

    SupClient.html("header", { parent: this.formElt, textContent: SupClient.i18n.t("project:treeView.newAsset.title") });
    SupClient.html("div", "group", { parent: this.formElt, textContent: SupClient.i18n.t("project:treeView.newAsset.prompt") });

    // Type
    const treeViewContainer = SupClient.html("div", [ "asset-types-tree-view", "group" ], {
      parent: this.formElt,
      style: {
        border: "1px solid #aaa",
        overflowY: "auto",
        height: "300px"
      }
    });
    this.treeView = new TreeView(treeViewContainer, { multipleSelection: false });
    this.treeView.treeRoot.style.paddingBottom = "0";
    this.treeView.on("selectionChange", this.onTreeViewSelectionChange);
    this.treeView.on("activate", this.onTreeViewActivate);

    for (const assetType of assetTypes) {
      const elt = SupClient.html("li", { dataset: { assetType } });
      this.treeView.append(elt, "item");

      const icon = SupClient.html("img", { parent: elt, src: "", draggable: false });
      icon.src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[assetType].pluginPath}/editors/${assetType}/icon.svg`;

      SupClient.html("span", { parent: elt, textContent: editorsByAssetType[assetType].title });
    }

    this.treeView.addToSelection(this.treeView.treeRoot.querySelector("li") as HTMLLIElement);
    this.selectedAssetType = assetTypes[0];

    // Name
    const nameGroup = SupClient.html("div", "group", { parent: this.formElt, style: { display: "flex" } });
    this.nameInputElt = SupClient.html("input", {
      parent: nameGroup, placeholder: SupClient.i18n.t("project:treeView.newAsset.placeholder"),
      pattern: SupClient.namePattern, title: SupClient.i18n.t("common:namePatternDescription"),
      style: { flex: "1 1 0" }
    });

    // Auto-open checkbox
    const downElt = SupClient.html("div", { parent: this.formElt, style: { display: "flex", alignItems: "center" } });

    this.openCheckboxElt = SupClient.html("input", {
      parent: downElt, id: "auto-open-checkbox", type: "checkbox",
      checked: open, style: { margin: "0 0.5em 0 0" }
    });

    SupClient.html("label", {
      parent: downElt, textContent: SupClient.i18n.t("project:treeView.newAsset.openAfterCreation"),
      htmlFor: "auto-open-checkbox", style: { flex: "1", margin: "0" }
    });

    // Buttons
    const buttonsElt = SupClient.html("div", "buttons", { parent: downElt });

    const cancelButtonElt = SupClient.html("button", "cancel-button", {
      parent: buttonsElt, type: "button",
      textContent: SupClient.i18n.t("common:actions.cancel")
    });
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = SupClient.html("button", "validate-button", {
      textContent: SupClient.i18n.t("common:actions.create")
    });

    if (navigator.platform === "Win32") buttonsElt.insertBefore(this.validateButtonElt, cancelButtonElt);
    else buttonsElt.appendChild(this.validateButtonElt);

    this.treeView.treeRoot.focus();
  }

  submit() {
    super.submit({
      name: this.nameInputElt.value,
      type: this.selectedAssetType,
      open: this.openCheckboxElt.checked
    });
  }

  private onTreeViewSelectionChange = () => {
    if (this.treeView.selectedNodes.length === 0) {
      this.treeView.addToSelection(this.treeView.treeRoot.querySelector(`li[data-asset-type="${this.selectedAssetType}"]`) as HTMLLIElement);
    } else {
      this.selectedAssetType = this.treeView.selectedNodes[0].dataset["assetType"];
    }
  };

  private onTreeViewActivate = () => {
    this.submit();
  };
}
