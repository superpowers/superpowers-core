type CreateAssetResult = { name: string; type: string; open: boolean; };

export default class CreateAssetDialog extends SupClient.dialogs.BaseDialog<CreateAssetResult> {
  private nameInputElt: HTMLInputElement;
  private typeSelectElt: HTMLSelectElement;
  private openCheckboxElt: HTMLInputElement;

  constructor(typeLabels: { [value: string]: string }, open: boolean, callback: (result: CreateAssetResult) => void) {
    super(callback);

    // Prompt name
    const labelElt = document.createElement("label");
    labelElt.textContent = SupClient.i18n.t("project:treeView.newAsset.prompt");
    this.formElt.appendChild(labelElt);

    // Type
    this.typeSelectElt = document.createElement("select");
    for (const typeName in typeLabels) {
      const optionElt = document.createElement("option");
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
    const downElt = document.createElement("div");
    downElt.style.display = "flex";
    downElt.style.alignItems = "center";
    this.formElt.appendChild(downElt);

    this.openCheckboxElt = document.createElement("input");
    this.openCheckboxElt.id = "auto-open-checkbox";
    this.openCheckboxElt.type = "checkbox";
    this.openCheckboxElt.checked = open;
    this.openCheckboxElt.style.margin = "0 0.5em 0 0";
    downElt.appendChild(this.openCheckboxElt);

    const openLabelElt = document.createElement("label");
    openLabelElt.textContent = SupClient.i18n.t("project:treeView.newAsset.openAfterCreation");
    openLabelElt.setAttribute("for", "auto-open-checkbox");
    openLabelElt.style.flex = "1";
    openLabelElt.style.margin = "0";
    downElt.appendChild(openLabelElt);

    // Buttons
    const buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    downElt.appendChild(buttonsElt);

    const cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = SupClient.i18n.t("common:actions.cancel");
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = document.createElement("button");
    this.validateButtonElt.textContent = SupClient.i18n.t("common:actions.create");
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

  submit() { super.submit({ name: this.nameInputElt.value, type: this.typeSelectElt.value, open: this.openCheckboxElt.checked }); }
}
