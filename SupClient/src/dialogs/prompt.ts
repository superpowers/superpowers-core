function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
  options: {type?: string; pattern?: string;}|((value: string) => any), callback: (value: string) => any) {

  if (callback == null && typeof options === 'function') {
    callback = <(value: string) => any>options;
    options = null;
  }

  if (options == null) options = {};
  var typedOptions = <{type?: string; pattern?: string;}>options;

  var dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  var messageElt = document.createElement("div");
  messageElt.className = "message";
  dialogElt.appendChild(messageElt);

  var labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  var inputElt = document.createElement("input");
  if (typedOptions.type != null) inputElt.type = typedOptions.type;
  // TODO: Wrap in a form element so the validation actually happens
  if (typedOptions.pattern != null) inputElt.pattern = typedOptions.pattern;
  inputElt.placeholder = (placeholder) ? placeholder : "";
  inputElt.value = (initialValue) ? initialValue : "";

  var onKeyUp = (event) => {
    if (event.keyCode === 13) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      var value = (inputElt.value !== "") ? inputElt.value : null;
      if (callback != null) callback(value);
    }
    else if (event.keyCode == 27) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      if (callback != null) callback(null);
    }
  }

  document.addEventListener("keyup", onKeyUp);
  messageElt.appendChild(inputElt);

  var buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  messageElt.appendChild(buttonsElt);

  var cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
    if (callback != null) callback(null);
  });

  var validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
    var value = (inputElt.value !== "") ? inputElt.value : null;
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

export = prompt;
