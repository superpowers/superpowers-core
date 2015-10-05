/// <reference path="./fuzzy.d.ts" />
import fuzzy = require("fuzzy");

export default function filter(list: string[], placeholder: string, callback: (value: string) => any) {
  let dialogElt = document.createElement("div"); dialogElt.className = "dialog";
  let formElt = document.createElement("form"); dialogElt.appendChild(formElt);

  let inputElt = document.createElement("input");
  inputElt.placeholder = (placeholder != null) ? placeholder : "";
  formElt.appendChild(inputElt);

  let labelParentElt = document.createElement("div");
  labelParentElt.className = "filter-parent";
  formElt.appendChild(labelParentElt);

  let labelElts: HTMLDivElement[] = [];
  let selectedIndex: number;

  let selectResult = (index: number) => {
    selectedIndex = index;
    labelElts[index].className = "selected";
    labelParentElt.scrollTop = (index - 3) * 20;
  }

  let noSlashesList: string[] = [];
  for (let text of list){
    let noSlashesText = text;
    while (noSlashesText.indexOf("/") !== -1) noSlashesText = noSlashesText.replace("/", " ");
    noSlashesList.push(noSlashesText);
  }

  let onKeyUp = (event: KeyboardEvent) => {
    if (inputElt.value !== "") {
      let previousSelectedResult = (selectedIndex != null) ? labelElts[selectedIndex].textContent : null;
      let newSelectedIndex: number;

      let results = fuzzy.filter(inputElt.value, list);
      let noSlashesResult = fuzzy.filter(inputElt.value, noSlashesList);

      results = results.concat(noSlashesResult);
      results.sort((a, b) => b.score - a.score);

      let resultsFound: string[] = [];

      for (let result of results) {
        let resultText = list[result.index];

        if (resultsFound.indexOf(resultText) !== -1) continue;
        resultsFound.push(resultText);

        let index = resultsFound.length - 1;
        if (labelElts[index] == null) {
          let labelElt = document.createElement("div");
          labelElt.textContent = resultText;
          labelParentElt.appendChild(labelElt);
          labelElts.push(labelElt);
        }
        else {
          labelElts[index].className = "";
          labelElts[index].textContent = resultText;
        }

        if (resultText === previousSelectedResult) newSelectedIndex = index;
      }

      while (labelElts.length > resultsFound.length) {
        labelParentElt.removeChild(labelElts[labelElts.length - 1]);
        labelElts.pop();
      }

      if (newSelectedIndex != null) selectResult(newSelectedIndex);
      else if (labelElts[0] != null) selectResult(0);
      else selectedIndex = null;
    }
    else {
      for (let labelElt of labelElts) labelParentElt.removeChild(labelElt);
      labelElts.length = 0;
      selectedIndex = null;
    }
  }

  let onKeyDown = (event: KeyboardEvent) => {
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
    else if (event.keyCode === 13) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      let value = (selectedIndex != null) ? labelElts[selectedIndex].textContent : null;
      if (callback != null) callback(value);
    }

    else if (event.keyCode === 27) {
      event.preventDefault();
      document.body.removeChild(dialogElt);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      if (callback != null) callback(null);
    }
  }

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);

  document.body.appendChild(dialogElt);
  inputElt.focus();
}
