interface PromptOptions {
   type?: string;
   pattern?: string;
   required?: boolean;
}

interface PromptCallback {
  (value: string): void;
}

export default function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
options: PromptOptions | PromptCallback, callback?: PromptCallback) {

  if (callback == null && typeof options === "function") {
    callback = <PromptCallback>options;
    options = {};
  } else if (options == null) options = {};
  let typedOptions = <PromptOptions>options;

  let dialogElt = document.createElement("div"); dialogElt.className = "dialog";
  let formElt = document.createElement("form"); dialogElt.appendChild(formElt);

  let labelElt = document.createElement("label");
  labelElt.textContent = label;
  formElt.appendChild(labelElt);

  let inputElt = document.createElement("input");
  if (typedOptions.type != null) inputElt.type = typedOptions.type;
  if (typedOptions.pattern != null) inputElt.pattern = typedOptions.pattern;
  inputElt.required = (typedOptions.required != null) ? typedOptions.required : true;
  inputElt.placeholder = (placeholder) ? placeholder : "";
  inputElt.value = (initialValue) ? initialValue : "";
  formElt.appendChild(inputElt);

  // Buttons
  let buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  formElt.appendChild(buttonsElt);

  let cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", closeDialog);

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
  formElt.addEventListener("submit", () => {
    if (! formElt.checkValidity()) return;

    event.preventDefault();
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(inputElt.value);
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
  inputElt.select();
}
