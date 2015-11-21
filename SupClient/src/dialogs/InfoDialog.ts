import BaseDialog from "./BaseDialog";

export default class InfoDialog extends BaseDialog {
  constructor(label: string, validationLabel: string, private callback: () => any) {
    super();

    let labelElt = document.createElement("label");
    labelElt.textContent = label;
    this.formElt.appendChild(labelElt);

    // Buttons
    let buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    this.formElt.appendChild(buttonsElt);

    this.validateButtonElt = document.createElement("button");
    this.validateButtonElt.textContent = validationLabel;
    this.validateButtonElt.className = "validate-button";
    buttonsElt.appendChild(this.validateButtonElt);

    this.validateButtonElt.focus();
  }

  submit() {
    if (!super.submit()) return false;
    if (this.callback != null) this.callback();
    return true;
  }
}
