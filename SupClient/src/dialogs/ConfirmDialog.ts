import BaseDialog from "./BaseDialog";

export default class ConfirmDialog extends BaseDialog {
  constructor(label: string, validationLabel: string, private callback: (confirmed: boolean) => any) {
    super();

    let labelElt = document.createElement("label");
    labelElt.textContent = label;
    this.formElt.appendChild(labelElt);

    // Buttons
    let buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    this.formElt.appendChild(buttonsElt);

    let cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = SupClient.i18n.t("common:actions.cancel");
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    let validateButtonElt = document.createElement("button");
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
