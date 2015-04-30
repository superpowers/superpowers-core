export default function confirm(label: string, validationLabel: string, callback: (value: boolean) => any) {
  let dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  let messageElt = document.createElement("div");
  messageElt.className = "message";
  dialogElt.appendChild(messageElt);

  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  let buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  messageElt.appendChild(buttonsElt);

  let onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      if (callback != null) callback(true);
    }
    else if (event.keyCode === 27) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      if (callback != null) callback(false);
    }
  };

  document.addEventListener("keydown", onKeyDown);

  let cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(false);
  });

  let validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
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
