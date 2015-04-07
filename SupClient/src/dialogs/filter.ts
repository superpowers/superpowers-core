///<reference path = "./fuzzy.d.ts"/>
import fuzzy = require("fuzzy");

function filter(list: string[], placeholder: string, callback: (value: string) => any) {
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

export = filter;
