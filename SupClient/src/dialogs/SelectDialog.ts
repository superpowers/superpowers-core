import BaseDialog from "./BaseDialog";

interface SelectOptions {
  validationLabel?: string;
  cancelLabel?: string;
  size?: number;
}
type SelectResult = string;

export default class SelectDialog extends BaseDialog<SelectResult> {
  selectElt: HTMLSelectElement;

  constructor(label: string, choices: { [value: string]: string; }, options?: SelectOptions, callback?: (result: SelectResult) => void) {
    super(callback);
    if (options == null) options = {};

    // Label
    const labelElt = document.createElement("label");
    labelElt.textContent = label;
    this.formElt.appendChild(labelElt);

    // Select
    this.selectElt = document.createElement("select");
    for (const choiceName in choices) {
      const optionElt = document.createElement("option");
      optionElt.value = choiceName;
      optionElt.textContent = choices[choiceName];
      this.selectElt.appendChild(optionElt);
    }

    if (options.size != null) this.selectElt.size = options.size;
    this.formElt.appendChild(this.selectElt);

    this.selectElt.addEventListener("keydown", (event) => {
      if (event.keyCode === 13) { event.preventDefault(); this.submit(); }
    });
    this.selectElt.addEventListener("dblclick", () => { this.submit(); });

    // Buttons
    const buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    this.formElt.appendChild(buttonsElt);

    const cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = options.cancelLabel != null ? options.cancelLabel : BaseDialog.defaultLabels.cancel;
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = document.createElement("button");
    this.validateButtonElt.textContent = options.validationLabel != null ? options.validationLabel : BaseDialog.defaultLabels.validate;
    this.validateButtonElt.className = "validate-button";

    if (navigator.platform === "Win32") {
      buttonsElt.appendChild(this.validateButtonElt);
      buttonsElt.appendChild(cancelButtonElt);
    } else {
      buttonsElt.appendChild(cancelButtonElt);
      buttonsElt.appendChild(this.validateButtonElt);
    }

    this.selectElt.focus();
  }

  submit() { super.submit((this.selectElt.value !== "") ? this.selectElt.value : null); }
}
