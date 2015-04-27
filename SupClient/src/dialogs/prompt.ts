export default function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
  options: {type?: string; pattern?: string;}|((value: string) => any), callback: (value: string) => any) {

  if (callback == null && typeof options === 'function') {
    callback = <(value: string) => any>options;
    options = null;
  }

  if (options == null) options = {};
  let typedOptions = <{type?: string; pattern?: string;}>options;

  let dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  let messageElt = document.createElement("div");
  messageElt.className = "message";
  dialogElt.appendChild(messageElt);

  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  let inputElt = document.createElement("input");
  if (typedOptions.type != null) inputElt.type = typedOptions.type;
  // TODO: Wrap in a form element so the validation actually happens
  if (typedOptions.pattern != null) inputElt.pattern = typedOptions.pattern;
  inputElt.placeholder = (placeholder) ? placeholder : "";
  inputElt.value = (initialValue) ? initialValue : "";

  let onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 13) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      let value = (inputElt.value !== "") ? inputElt.value : null;
      if (callback != null) callback(value);
    }
    else if (event.keyCode == 27) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      if (callback != null) callback(null);
    }
  }

  document.addEventListener("keydown", onKeyDown);
  messageElt.appendChild(inputElt);

  let buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  messageElt.appendChild(buttonsElt);

  let cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(null);
  });

  let validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    let value = (inputElt.value !== "") ? inputElt.value : null;
    if (callback != null) callback(value);
  });

  if (navigator.platform === "Win32") {
    buttonsElt.appendChild(validateButtonElt);
    buttonsElt.appendChild(cancelButtonElt);
  }
  else {
    buttonsElt.appendChild(cancelButtonElt);
    buttonsElt.appendChild(validateButtonElt);
  }

  document.body.appendChild(dialogElt);
  inputElt.select();
}
