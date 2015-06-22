export default function select(label: string, options: {[value: string]: string}, validationLabel: string, callback: (value: string) => any) {
  let dialogElt = document.createElement("div"); dialogElt.className = "dialog";
  let formElt = document.createElement("form"); dialogElt.appendChild(formElt);

  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  formElt.appendChild(labelElt);

  let selectElt = document.createElement("select");
  for (let optionName in options) {
    let optionElt = document.createElement("option");
    optionElt.textContent = optionName;
    optionElt.value = options[optionName];
    selectElt.appendChild(optionElt);
  }
  formElt.appendChild(selectElt);

  selectElt.addEventListener("keydown", (event) => {
    if (event.keyCode == 13) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      if (callback != null) callback((selectElt.value !== "") ? selectElt.value : null);
    }
  });

  // Buttons
  let buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  formElt.appendChild(buttonsElt);

  let cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); closeDialog(); });

  let validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";

  if (navigator.platform === "Win32") {
    buttonsElt.appendChild(validateButtonElt);
    buttonsElt.appendChild(cancelButtonElt);
  } else {
    buttonsElt.appendChild(cancelButtonElt);
    buttonsElt.appendChild(validateButtonElt);
  }

  // Validation and cancellation
  formElt.addEventListener("submit", (event) => {
    if (! formElt.checkValidity()) return;

    event.preventDefault();
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback((selectElt.value !== "") ? selectElt.value : null);
  });

  function onKeyDown(event: KeyboardEvent) { if (event.keyCode === 27) { event.preventDefault(); closeDialog(); } }
  document.addEventListener("keydown", onKeyDown);

  function closeDialog() {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(null);
  }

  // Show dialog
  document.body.appendChild(dialogElt);
  selectElt.focus();
}
