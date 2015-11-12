interface NewProjectCallback {
  (project: { type: string; name: string, description: string; icon: File; }, open: boolean): any;
}

export default function newProjectDialog(typeLabels: { [value: string]: string }, open: boolean,
callback: NewProjectCallback) {

  let dialogElt = document.createElement("div"); dialogElt.className = "dialog";
  let formElt = document.createElement("form"); dialogElt.appendChild(formElt);

  // Prompt name
  let labelElt = document.createElement("label");
  labelElt.textContent = "Enter a name and select a type for the new project.";
  formElt.appendChild(labelElt);

  let containerElt = document.createElement("div");
  containerElt.className = "group";
  containerElt.style.display = "flex";
  formElt.appendChild(containerElt);

  // Icon
  let iconFile: File = null;
  
  let iconInputElt = document.createElement("input")
  iconInputElt.hidden = true;
  iconInputElt.type = "file";
  iconInputElt.accept = "image/png";
  containerElt.appendChild(iconInputElt);

  let iconButtonElt = document.createElement("button");
  iconButtonElt.type = "button";
  iconButtonElt.style.cursor = "pointer";
  iconButtonElt.style.border = "0";
  iconButtonElt.style.background = "transparent";
  iconButtonElt.style.width = "72px";
  iconButtonElt.style.height = "72px";
  iconButtonElt.style.margin = "0";
  iconButtonElt.style.padding = "0";
  iconButtonElt.style.fontSize = "0";
  containerElt.appendChild(iconButtonElt);

  iconButtonElt.addEventListener("click", () => iconInputElt.click());

  let iconElt = new Image();
  iconElt.src = "/images/default-project-icon.png";
  iconElt.draggable = false;
  iconElt.style.width = "72px";
  iconElt.style.height = "72px";
  iconElt.style.border = "1px solid rgba(0,0,0,0.2)";
  iconElt.style.borderRadius = "4px";
  iconElt.style.background = "#eee";
  iconButtonElt.appendChild(iconElt);

  iconInputElt.addEventListener("change", (event) => {
    if (iconInputElt.files.length === 0) {
      iconFile = null;
      iconElt.src = "/images/default-project-icon.png";
    } else {
      iconFile = iconInputElt.files[0];
      let reader = new FileReader();
      reader.addEventListener("load", (event) => {
        iconElt.src = (<any>event.target).result;
      });
      reader.readAsDataURL(iconFile);
    }
  });

  let textContainerElt = document.createElement("div");
  textContainerElt.style.flex = "1";
  textContainerElt.style.display = "flex";
  textContainerElt.style.flexFlow = "column";
  textContainerElt.style.marginLeft = "0.5em";
  containerElt.appendChild(textContainerElt);

  // Name
  let nameInputElt = document.createElement("input");
  nameInputElt.required = true;
  nameInputElt.placeholder = "Project name";
  nameInputElt.pattern = "[^/]+";
  nameInputElt.title = "Must contain no slashes."
  textContainerElt.appendChild(nameInputElt);

  // Description
  let descriptionInputElt = document.createElement("textarea");
  descriptionInputElt.style.flex = "1";
  (<any>descriptionInputElt.style).resize = "none";
  descriptionInputElt.placeholder = "Description (optional)";
  textContainerElt.appendChild(descriptionInputElt);

  // Type
  let typeSelectElt = document.createElement("select");
  for (let typeName in typeLabels) {
    let optionElt = document.createElement("option");
    optionElt.textContent = typeName;
    optionElt.value = typeLabels[typeName];
    typeSelectElt.appendChild(optionElt);
  }
  typeSelectElt.size = 5;
  formElt.appendChild(typeSelectElt);

  // Auto-open checkbox
  let downElt = document.createElement("div");
  downElt.style.display = "flex";
  downElt.style.alignItems = "center";
  formElt.appendChild(downElt);

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
    if (callback != null) {
      let project = {
        type: typeSelectElt.value,
        name: nameInputElt.value,
        description: descriptionInputElt.value,
        icon: iconFile
      };
      callback(project, openCheckboxElt.checked);
    }
  }

  formElt.addEventListener("submit", (event) => {
    if (!formElt.checkValidity()) return;
    event.preventDefault();
    submit();
  });

  typeSelectElt.addEventListener("keydown", (event) => {
    if (event.keyCode == 13) {
      event.preventDefault();

      if (!formElt.checkValidity()) {
        validateButtonElt.click();
        return;
      }

      submit();
    }
  });

  typeSelectElt.addEventListener("dblclick", (event) => {
    if (!formElt.checkValidity()) {
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
    if (callback != null) callback(null, null);
  }

  // Show dialog
  document.body.appendChild(dialogElt);
  nameInputElt.focus();
}
