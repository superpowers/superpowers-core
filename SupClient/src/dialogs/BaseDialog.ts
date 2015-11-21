abstract class BaseDialog {
  dialogElt: HTMLDivElement;
  formElt: HTMLFormElement;
  validateButtonElt: HTMLButtonElement;

  static activeDialog: BaseDialog;

  constructor() {
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

  // OVERRIDE and check super.submit()'s return value
  submit() {
    if (!this.formElt.checkValidity()) {
      // Trigger form validation
      this.validateButtonElt.click();
      return false;
    }

    this.dismiss();
    return true;
  }

  // OVERRIDE
  cancel() {
    this.dismiss();
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
