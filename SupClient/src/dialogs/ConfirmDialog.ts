import BaseDialog from "./BaseDialog";

interface ConfirmOptions {
  validationLabel?: string;
  cancelLabel?: string;
}
type ConfirmResult = boolean;

export default class ConfirmDialog extends BaseDialog<ConfirmResult> {
  constructor(label: string, options?: ConfirmOptions, callback?: (confirmed: ConfirmResult) => void) {
    super(callback);
    if (options == null) options = {};

    const labelElt = document.createElement("label");
    labelElt.textContent = label;
    this.formElt.appendChild(labelElt);

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

    this.validateButtonElt.focus();
  }

  submit() { super.submit(true); }
  cancel() { super.cancel(false); }
}
