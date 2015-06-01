export default function info(label: string, validationLabel: string, callback: () => any) {
  let dialogElt = document.createElement("div"); dialogElt.className = "dialog";
  let formElt = document.createElement("form"); dialogElt.appendChild(formElt);

  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  formElt.appendChild(labelElt);

  // Buttons
  let buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  formElt.appendChild(buttonsElt);

  let validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  buttonsElt.appendChild(validateButtonElt);

  // Validation and cancellation
  formElt.addEventListener("submit", () => { event.preventDefault(); closeDialog(); });

  function onKeyDown(event: KeyboardEvent) { if (event.keyCode === 27) { event.preventDefault(); closeDialog(); } }
  document.addEventListener("keydown", onKeyDown);
  
  function closeDialog() {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback();
  }

  // Show dialog
  document.body.appendChild(dialogElt);
  validateButtonElt.focus();
}
