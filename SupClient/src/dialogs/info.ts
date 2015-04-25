export default function info(label: string, validationLabel: string, callback: () => any) {
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

  let validateButtonElt = document.createElement("button");
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
