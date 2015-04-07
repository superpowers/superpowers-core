function confirm(label: string, validationLabel: string, callback: (value: boolean) => any) {
  var dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  var messageElt = document.createElement("div");
  messageElt.className = "message";
  dialogElt.appendChild(messageElt);

  var labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  var buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  messageElt.appendChild(buttonsElt);

  var onKeyUp = (event) => {
    if (event.keyCode === 13) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      if (callback != null) callback(true);
    }
    else if (event.keyCode === 27) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      if (callback != null) callback(false);
    }
  };

  document.addEventListener("keyup", onKeyUp);

  var cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
    if (callback != null) callback(false);
  });

  var validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
    if (callback != null) callback(true);
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
  validateButtonElt.focus();
}

export = confirm;
