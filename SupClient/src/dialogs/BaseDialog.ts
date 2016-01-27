abstract class BaseDialog<T> {
  dialogElt: HTMLDivElement;
  formElt: HTMLFormElement;
  validateButtonElt: HTMLButtonElement;

  static activeDialog: BaseDialog<any>;
  static defaultLabels = {
    "validate": "Validate",
    "cancel": "Cancel",
    "close": "Close"
  };

  constructor(private callback: (result: T) => any) {
    if (BaseDialog.activeDialog != null) throw new Error("Cannot open two dialogs at the same time.");

    BaseDialog.activeDialog = this;
    this.dialogElt = document.createElement("div");
    this.dialogElt.className = "dialog";
    this.formElt = document.createElement("form");
    this.dialogElt.appendChild(this.formElt);

    this.formElt.addEventListener("submit", (event) => {
      if (!this.formElt.checkValidity()) return;
      event.preventDefault();
      this.submit();
    });

    document.addEventListener("keydown", this.onDocumentKeyDown);
    document.body.appendChild(this.dialogElt);
  }

  submit(result?: T) {
    if (!this.formElt.checkValidity()) {
      // Trigger form validation
      this.validateButtonElt.click();
      return;
    }

    this.dismiss();
    if (this.callback != null) this.callback(result);
  }

  cancel(result?: T) {
    this.dismiss();
    if (this.callback != null) this.callback(result);
  }

  protected onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 27) {
      event.preventDefault();
      this.cancel();
    }
  };

  protected dismiss() {
    BaseDialog.activeDialog = null;
    document.body.removeChild(this.dialogElt);
    document.removeEventListener("keydown", this.onDocumentKeyDown);
  }
}

export default BaseDialog;
