interface CreateAssetCallback {
  (name: string, type: string, open: boolean): any;
}

export default class CreateAssetDialog extends SupClient.dialogs.BaseDialog {
  private nameInputElt: HTMLInputElement;
  private typeSelectElt: HTMLSelectElement;
  private openCheckboxElt: HTMLInputElement;

  constructor(typeLabels: { [value: string]: string }, open: boolean, private callback: CreateAssetCallback) {
    super();

    // Prompt name
    let labelElt = document.createElement("label");
    labelElt.textContent = SupClient.i18n.t("project:treeView.newAsset.prompt");
    this.formElt.appendChild(labelElt);

    // Type
    this.typeSelectElt = document.createElement("select");
    for (let typeName in typeLabels) {
      let optionElt = document.createElement("option");
      optionElt.textContent = typeName;
      optionElt.value = typeLabels[typeName];
      this.typeSelectElt.appendChild(optionElt);
    }
    this.typeSelectElt.size = 12;
    this.formElt.appendChild(this.typeSelectElt);

    // Name
    this.nameInputElt = document.createElement("input");
    this.nameInputElt.placeholder = SupClient.i18n.t("project:treeView.newAsset.placeholder");
    this.nameInputElt.pattern = SupClient.namePattern;
    this.nameInputElt.title = SupClient.i18n.t("common:namePatternDescription");
    this.formElt.appendChild(this.nameInputElt);

    // Auto-open checkbox
    let downElt = document.createElement("div");
    downElt.style.display = "flex";
    downElt.style.alignItems = "center";
    this.formElt.appendChild(downElt);

    this.openCheckboxElt = document.createElement("input");
    this.openCheckboxElt.id = "auto-open-checkbox";
    this.openCheckboxElt.type = "checkbox";
    this.openCheckboxElt.checked = open;
    this.openCheckboxElt.style.margin = "0 0.5em 0 0";
    downElt.appendChild(this.openCheckboxElt);

    let openLabelElt = document.createElement("label");
    openLabelElt.textContent = SupClient.i18n.t("project:treeView.newAsset.openAfterCreation");
    openLabelElt.setAttribute("for", "auto-open-checkbox");
    openLabelElt.style.flex = "1";
    openLabelElt.style.margin = "0";
    downElt.appendChild(openLabelElt);

    // Buttons
    let buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    downElt.appendChild(buttonsElt);

    let cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = SupClient.i18n.t("common:cancel");
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = document.createElement("button");
    this.validateButtonElt.textContent = SupClient.i18n.t("project:treeView.newAsset.validate");
    this.validateButtonElt.className = "validate-button";

    if (navigator.platform === "Win32") {
      buttonsElt.appendChild(this.validateButtonElt);
      buttonsElt.appendChild(cancelButtonElt);
    } else {
      buttonsElt.appendChild(cancelButtonElt);
      buttonsElt.appendChild(this.validateButtonElt);
    }

    this.typeSelectElt.addEventListener("keydown", (event) => { if (event.keyCode === 13 /* Enter */) this.submit(); });
    this.typeSelectElt.addEventListener("dblclick", (event) => { this.submit(); });
    this.typeSelectElt.focus();
  }

  submit() {
    if (!super.submit()) return false;
    this.callback(this.nameInputElt.value, this.typeSelectElt.value, this.openCheckboxElt.checked);
    return true;
  }

  cancel() {
    super.cancel();
    this.callback(null, null, null);
  }
}
