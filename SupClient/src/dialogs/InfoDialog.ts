import BaseDialog from "./BaseDialog";

interface InfoOptions {
  closeLabel?: string;
}

export default class InfoDialog extends BaseDialog<any> {
  constructor(label: string, options?: InfoOptions, callback?: () => void) {
    super(callback);
    if (options == null) options = {};

    const labelElt = document.createElement("label");
    labelElt.textContent = label;
    this.formElt.appendChild(labelElt);

    // Buttons
    const buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    this.formElt.appendChild(buttonsElt);

    this.validateButtonElt = document.createElement("button");
    this.validateButtonElt.textContent = options.closeLabel != null ? options.closeLabel : BaseDialog.defaultLabels.close;
    this.validateButtonElt.className = "validate-button";
    buttonsElt.appendChild(this.validateButtonElt);

    this.validateButtonElt.focus();
  }
}
