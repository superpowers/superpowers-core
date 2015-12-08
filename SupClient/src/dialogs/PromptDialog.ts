import BaseDialog from "./BaseDialog";
import * as i18n from "../i18n";

interface PromptOptions {
   type?: string;
   initialValue?: string;
   placeholder?: string;
   pattern?: string;
   title?: string;
   required?: boolean;
   validationLabel?: string;
   cancelLabel?: string;
}

interface PromptCallback {
  (value: string): void;
}

export default class PromptDialog extends BaseDialog {
  inputElt: HTMLInputElement;

  constructor(label: string, options?: PromptOptions, private callback?: PromptCallback) {
    super();

    if (options == null) options = {};

    let labelElt = document.createElement("label");
    labelElt.textContent = label;
    this.formElt.appendChild(labelElt);

    this.inputElt = document.createElement("input");
    if (options.type != null) this.inputElt.type = options.type;
    if (options.initialValue != null) this.inputElt.value = options.initialValue;
    if (options.placeholder != null) this.inputElt.placeholder = options.placeholder;
    if (options.pattern != null) this.inputElt.pattern = options.pattern;
    if (options.title != null) this.inputElt.title = options.title;
    this.inputElt.required = (options.required != null) ? options.required : true;
    this.formElt.appendChild(this.inputElt);

    // Buttons
    let buttonsElt = document.createElement("div");
    buttonsElt.className = "buttons";
    this.formElt.appendChild(buttonsElt);

    let cancelButtonElt = document.createElement("button");
    cancelButtonElt.type = "button";
    cancelButtonElt.textContent = (options.cancelLabel != null) ? options.cancelLabel : i18n.t("common:actions.cancel");
    cancelButtonElt.className = "cancel-button";
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = document.createElement("button");
    this.validateButtonElt.textContent = options.validationLabel;
    this.validateButtonElt.className = "validate-button";

    if (navigator.platform === "Win32") {
      buttonsElt.appendChild(this.validateButtonElt);
      buttonsElt.appendChild(cancelButtonElt);
    } else {
      buttonsElt.appendChild(cancelButtonElt);
      buttonsElt.appendChild(this.validateButtonElt);
    }

    this.inputElt.select();
  }

  submit() {
    if (!super.submit()) return false;
    if (this.callback != null) this.callback(this.inputElt.value);
    return true;
  }

  cancel() {
    super.cancel();
    if (this.callback != null) this.callback(null);
  }
}
