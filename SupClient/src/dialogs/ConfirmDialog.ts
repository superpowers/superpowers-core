import BaseDialog from "./BaseDialog";
import * as i18n from "../i18n";

export default class ConfirmDialog extends BaseDialog {
  constructor(label: string, validationLabel: string, private callback: (confirmed: boolean) => any) {
    super();

    const labelElt = document.createElement("label");
    labelElt.textContent = label;
    this.formElt.appendChild(labelElt);

    // Buttons
    const buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    this.formElt.appendChild(buttonsElt);

    const cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = i18n.t("common:actions.cancel");
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    const validateButtonElt = document.createElement("button");
    validateButtonElt.textContent = validationLabel;
    validateButtonElt.className = "validate-button";

    if (navigator.platform === "Win32") {
      buttonsElt.appendChild(validateButtonElt);
      buttonsElt.appendChild(cancelButtonElt);
    } else {
      buttonsElt.appendChild(cancelButtonElt);
      buttonsElt.appendChild(validateButtonElt);
    }

    validateButtonElt.focus();
  }

  submit() {
    if (!super.submit()) return false;
    this.callback(true);
    return true;
  }

  cancel() {
    super.cancel();
    this.callback(false);
  }
}
