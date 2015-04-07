///<reference path = "./fuzzy.d.ts"/>

import fuzzy = require("fuzzy");

export function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
  options: {type?: string; pattern?: string;}|((value: string) => any), callback: (value: string) => any) {

  if (callback == null && typeof options === 'function') {
    callback = <(value: string) => any>options;
    options = null;
  }

  if (options == null) options = {};
  var typedOptions = <{type?: string; pattern?: string;}>options;

  var dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  var messageElt = document.createElement("div");
  messageElt.className = "message";
  dialogElt.appendChild(messageElt);

  var labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  var inputElt = document.createElement("input");
  if (typedOptions.type != null) inputElt.type = typedOptions.type;
  // TODO: Wrap in a form element so the validation actually happens
  if (typedOptions.pattern != null) inputElt.pattern = typedOptions.pattern;
  inputElt.placeholder = (placeholder) ? placeholder : "";
  inputElt.value = (initialValue) ? initialValue : "";

  var onKeyUp = (event) => {
    if (event.keyCode === 13) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      var value = (inputElt.value !== "") ? inputElt.value : null;
      if (callback != null) callback(value);
    }
    else if (event.keyCode == 27) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      if (callback != null) callback(null);
    }
  }

  document.addEventListener("keyup", onKeyUp);
  messageElt.appendChild(inputElt);

  var buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  messageElt.appendChild(buttonsElt);

  var cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
    if (callback != null) callback(null);
  });

  var validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
    var value = (inputElt.value !== "") ? inputElt.value : null;
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
  inputElt.select();
}

export function confirm(label: string, validationLabel: string, callback: (value: boolean) => any) {
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

  var onKeyUp = (event) => {
    if (event.keyCode === 13) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      if (callback != null) callback(true);
    }
    else if (event.keyCode === 27) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      if (callback != null) callback(false);
    }
  };

  document.addEventListener("keyup", onKeyUp);

  var cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
    if (callback != null) callback(false);
  });

  var validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keyup", onKeyUp);
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

export function info(label: string, validationLabel: string, callback: () => any) {
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

export function select(label: string, options: {[value: string]: string}, validationLabel: string, callback: (value: string) => any) {
  var dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  var messageElt = document.createElement("div");
  messageElt.className = "message",
  dialogElt.appendChild(messageElt);

  var labelElt = document.createElement("label");
  labelElt.textContent = label;
  messageElt.appendChild(labelElt);

  var selectElt = document.createElement("select");
  for (var optionName in options) {
    var optionElt = document.createElement("option");
    optionElt.textContent = optionName;
    optionElt.value = options[optionName];
    selectElt.appendChild(optionElt);
  }

  var onKeyDown = (event) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown);
      var value = (selectElt.value != "") ? selectElt.value : null;
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

  var buttonsElt = document.createElement("div");
  buttonsElt.className = "buttons";
  messageElt.appendChild(buttonsElt);

  var cancelButtonElt = document.createElement("button");
  cancelButtonElt.textContent = "Cancel";
  cancelButtonElt.className = "cancel-button";
  cancelButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    if (callback != null) callback(null);
  });

  var validateButtonElt = document.createElement("button");
  validateButtonElt.textContent = validationLabel;
  validateButtonElt.className = "validate-button";
  validateButtonElt.addEventListener("click", () => {
    document.body.removeChild(dialogElt);
    document.removeEventListener("keydown", onKeyDown);
    var value = (selectElt.value != "") ? selectElt.value : null;
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

export function filter(list: string[], placeholder: string, callback: (value: string) => any) {
  var dialogElt = document.createElement("div");
  dialogElt.className = "dialog";

  var messageElt = document.createElement("div");
  messageElt.className = "message";
  dialogElt.appendChild(messageElt);

  var inputElt = document.createElement("input");
  inputElt.placeholder = (placeholder != null) ? placeholder : "";
  messageElt.appendChild(inputElt);

  var labelParentElt = document.createElement("div");
  labelParentElt.className = "filter-parent";
  messageElt.appendChild(labelParentElt);

  var labelElts = [];
  var selectedIndex: number;

  var selectResult = (index) => {
    selectedIndex = index;
    labelElts[index].className = "selected";
    labelParentElt.scrollTop = (index - 3) * 20;
  }

  var onKeyDown = (event) => {
    if (event.keyCode === 38) {
      event.preventDefault();
      if (selectedIndex != null && selectedIndex > 0) {
        labelElts[selectedIndex].className = "";
        selectResult(selectedIndex - 1);
      }
    }
    else if (event.keyCode === 40) {
      event.preventDefault();
      if (selectedIndex != null && selectedIndex < labelElts.length - 1) {
        labelElts[selectedIndex].className = "";
        selectResult(selectedIndex + 1);
      }
    }
  }

  var onKeyUp = (event) => {
    if (event.keyCode === 13) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
      var value = (selectedIndex != null) ? labelElts[selectedIndex].textContent : null;
      if (callback != null) callback(value);
    }

    else if (event.keyCode === 27) {
      document.body.removeChild(dialogElt);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
      if (callback != null) callback(null);
    }

    else if (inputElt.value !== "") {
      var previousSelectedResult = (selectedIndex != null) ? labelElts[selectedIndex].textContent : null;
      var newSelectedIndex: number;

      var results = fuzzy.filter(inputElt.value, list);
      results.forEach((result, index) => {
        if (labelElts[index] == null) {
          var labelElt = document.createElement("div");
          labelElt.textContent = result.original;
          labelParentElt.appendChild(labelElt);
          labelElts.push(labelElt);
        }
        else {
          labelElts[index].className = "";
          labelElts[index].textContent = result.original;
        }

        if (result.original === previousSelectedResult) newSelectedIndex = index;
      });

      while (labelElts.length > results.length) {
        labelParentElt.removeChild(labelElts[labelElts.length - 1]);
        labelElts.pop();
      }

      if (newSelectedIndex != null) selectResult(newSelectedIndex);
      else if (labelElts[0] != null) selectResult(0);
      else selectedIndex = null;
    }
    else {
      labelElts.forEach((labelElt) => { labelParentElt.removeChild(labelElt); });
      labelElts.length = 0;
      selectedIndex = null;
    }
  }

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp);

  document.body.appendChild(dialogElt);
  inputElt.focus();
}
