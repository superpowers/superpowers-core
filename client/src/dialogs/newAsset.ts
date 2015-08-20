export default function newAssetDialog(label: string, typeList: { [value: string]: string }, open: boolean,
callback: (name: string, type: string, open: boolean) => any) {

  let dialogElt = document.createElement("div"); dialogElt.className = "dialog";
  let formElt = document.createElement("form"); dialogElt.appendChild(formElt);

  // Prompt name
  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  formElt.appendChild(labelElt);

  let nameInputElt = document.createElement("input");
  nameInputElt.placeholder = "Asset name";
  nameInputElt.pattern = "[^/]+";
  nameInputElt.title = "Must contain no slashes."
  formElt.appendChild(nameInputElt);

  // Select type
  let typeSelectElt = document.createElement("select");
  for (let typeName in typeList) {
    let optionElt = document.createElement("option");
    optionElt.textContent = typeName;
    optionElt.value = typeList[typeName];
    typeSelectElt.appendChild(optionElt);
  }
  typeSelectElt.size = 5;
  formElt.appendChild(typeSelectElt);

  let downElt = document.createElement("div");
  downElt.style.display = "flex";
  downElt.style.alignItems = "center";
  formElt.appendChild(downElt);

  // Auto-open checkbox
  let openCheckboxElt = document.createElement("input");
  openCheckboxElt.id = "auto-open-checkbox";
  openCheckboxElt.type = "checkbox";
  openCheckboxElt.checked = open;
  openCheckboxElt.style.margin = "0 0.5em 0 0";
  downElt.appendChild(openCheckboxElt);

  let openLabelElt = document.createElement("label");
  openLabelElt.textContent = "Open after creation";
  openLabelElt.setAttribute("for","auto-open-checkbox");
  openLabelElt.style.flex = "1";
  openLabelElt.style.margin = "0";
  downElt.appendChild(openLabelElt);

  // Buttons
  let buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  downElt.appendChild(buttonsElt);

  let cancelButtonElt = document.createElement("button");
  cancelButtonElt.type = "button";
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); closeDialog(); });

  let validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = "Create";
  validateButtonElt.className = "validate-button";

  if (navigator.platform === "Win32") {
    buttonsElt.appendChild(validateButtonElt);
    buttonsElt.appendChild(cancelButtonElt);
  } else {
    buttonsElt.appendChild(cancelButtonElt);
    buttonsElt.appendChild(validateButtonElt);
  }

  // Validation and cancellation
  function submit() {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(nameInputElt.value, typeSelectElt.value, openCheckboxElt.checked);
  }

  formElt.addEventListener("submit", (event) => {
    if (! formElt.checkValidity()) return;
    event.preventDefault();
    submit();
  });

  typeSelectElt.addEventListener("keydown", (event) => {
    if (event.keyCode == 13) {
      event.preventDefault();

      if (! formElt.checkValidity()) {
        validateButtonElt.click();
        return;
      }

      submit();
    }
  });

  typeSelectElt.addEventListener("dblclick", (event) => {
    if (! formElt.checkValidity()) {
      validateButtonElt.click();
      return;
    }

    submit();
  })

  function onKeyDown(event: KeyboardEvent) { if (event.keyCode === 27) { event.preventDefault(); closeDialog(); } }
  document.addEventListener("keydown", onKeyDown);

  function closeDialog() {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(null, null, null);
  }

  // Show dialog
  document.body.appendChild(dialogElt);
  nameInputElt.select();
}
