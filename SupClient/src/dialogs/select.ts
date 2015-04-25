export default function select(label: string, options: {[value: string]: string}, validationLabel: string, callback: (value: string) => any) {
  let dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  let messageElt = document.createElement("div");
  messageElt.className = "message",
  dialogElt.appendChild(messageElt);

  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  let selectElt = document.createElement("select");
  for (let optionName in options) {
    let optionElt = document.createElement("option");
    optionElt.textContent = optionName;
    optionElt.value = options[optionName];
    selectElt.appendChild(optionElt);
  }

  let onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      let value = (selectElt.value != "") ? selectElt.value : null;
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
    let value = (selectElt.value != "") ? selectElt.value : null;
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
