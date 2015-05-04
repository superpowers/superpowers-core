export default function newAssetDialog(label: string, typeList: {[value: string]: string}, open: boolean,
callback: (name: string, type: string, open: boolean) => any) {

  let dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  let messageElt = document.createElement("div");
  messageElt.className = "message";
  dialogElt.appendChild(messageElt);

  // Prompt name
  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  let nameInputElt = document.createElement("input");
  nameInputElt.placeholder = "Asset name"
  messageElt.appendChild(nameInputElt);

  // Select type
  let typeSelectElt = document.createElement("select");
  for (let typeName in typeList) {
    let optionElt = document.createElement("option");
    optionElt.textContent = typeName;
    optionElt.value = typeList[typeName];
    typeSelectElt.appendChild(optionElt);
  }
  messageElt.appendChild(typeSelectElt);

  let downElt = document.createElement("div");
  downElt.style.display = "flex";
  downElt.style.alignItems = "center";
  messageElt.appendChild(downElt);

  // Auto-open checkbox
  let openCheckboxElt = document.createElement("input");
  openCheckboxElt.id = "auto-open-checkbox";
  openCheckboxElt.type = "checkbox";
  openCheckboxElt.checked = open;
  openCheckboxElt.style.margin = "0 0.5em 0 0";
  downElt.appendChild(openCheckboxElt);

  let openlabelElt = document.createElement("label");
  openlabelElt.textContent = "Open after creation";
  openlabelElt.setAttribute("for","auto-open-checkbox");
  openlabelElt.style.flex = "1";
  openlabelElt.style.margin = "0";
  downElt.appendChild(openlabelElt);

  // Buttons
  let buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  downElt.appendChild(buttonsElt);

  let cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(null, null, null);
  });

  let validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = "Create";
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    let name = (nameInputElt.value !== "") ? nameInputElt.value : null;
    let type = typeSelectElt.value;
    let open = openCheckboxElt.checked;
    if (callback != null) callback(name, type, open);
  });

  if (navigator.platform === "Win32") {
    buttonsElt.appendChild(validateButtonElt);
    buttonsElt.appendChild(cancelButtonElt);
  }
  else {
    downElt.appendChild(cancelButtonElt);
    downElt.appendChild(validateButtonElt);
  }

  // Keyboard event
  function onKeyDown(event: KeyboardEvent) {
    if (event.keyCode === 13) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      let name = (nameInputElt.value !== "") ? nameInputElt.value : null;
      let type = typeSelectElt.value;
      let open = openCheckboxElt.checked;
      if (callback != null) callback(name, type, open);
    }
    else if (event.keyCode == 27) {
    event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      if (callback != null) callback(null, null, null);
    }
  }
  document.addEventListener("keydown", onKeyDown);

  document.body.appendChild(dialogElt);
  nameInputElt.select();
}
