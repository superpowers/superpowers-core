function select(label: string, options: {[value: string]: string}, validationLabel: string, callback: (value: string) => any) {
  var dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  var messageElt = document.createElement("div");
  messageElt.className = "message",
  dialogElt.appendChild(messageElt);

  var labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  var selectElt = document.createElement("select");
  for (var optionName in options) {
    var optionElt = document.createElement("option");
    optionElt.textContent = optionName;
    optionElt.value = options[optionName];
    selectElt.appendChild(optionElt);
  }

  var onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      var value = (selectElt.value != "") ? selectElt.value : null;
      if (callback != null) callback(value);
    }
    else if (event.keyCode === 27) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      if (callback != null) callback(null);
    }
  }

  document.addEventListener("keydown", onKeyDown);
  messageElt.appendChild(selectElt);

  var buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  messageElt.appendChild(buttonsElt);

  var cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(null);
  });

  var validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    var value = (selectElt.value != "") ? selectElt.value : null;
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
  selectElt.focus();
}

export = select;
