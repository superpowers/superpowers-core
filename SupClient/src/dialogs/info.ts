function info(label: string, validationLabel: string, callback: () => any) {
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

  var validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    if (callback != null) callback();
  });
  buttonsElt.appendChild(validateButtonElt);

  document.body.appendChild(dialogElt);
  validateButtonElt.focus();
}

export = info;
