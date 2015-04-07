export function createSetting(parentElt: HTMLDivElement, name: string, options: {checkbox?: boolean; title?: string;}):
{rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;} {
  var rowElt = document.createElement('tr');
  parentElt.appendChild(rowElt);

  var keyElt = document.createElement('th');
  rowElt.appendChild(keyElt);

  if (options != null && options.checkbox) {
    var containerElt = document.createElement('div');
    containerElt.className = '';
    keyElt.appendChild(containerElt);

    var nameElt = document.createElement('div');
    nameElt.textContent = name;
    nameElt.title = options.title;
    containerElt.appendChild(nameElt);

    var checkboxElt = document.createElement('input');
    checkboxElt.type = 'checkbox';
    containerElt.appendChild(checkboxElt);
  }
  else keyElt.textContent = name;

  var valueElt = document.createElement('td');
  rowElt.appendChild(valueElt);

  return { rowElt, keyElt, valueElt, checkboxElt };
}

export function createTextField(parentElt: HTMLTableDataCellElement, value: string): HTMLInputElement {
  var inputElt = document.createElement('input');
  inputElt.type = 'text';
  parentElt.appendChild(inputElt);

  inputElt.value = value;

  return inputElt;
}

export function createNumberField(parentElt: HTMLTableDataCellElement, value: any, min?: any, max?: any): HTMLInputElement {
  var inputElt = document.createElement('input');
  inputElt.type = 'number';
  parentElt.appendChild(inputElt);

  inputElt.value = value;
  if (min != null ) inputElt.min = min;
  if (max != null) inputElt.max = max;

  return inputElt;
}

export function createBooleanField(parentElt: HTMLTableDataCellElement, value: boolean): HTMLInputElement {
  var inputElt = document.createElement('input');
  inputElt.type = 'checkbox';
  parentElt.appendChild(inputElt);

  inputElt.checked = value;

  return inputElt;
}

export function createSelectBox(parentElt: HTMLTableDataCellElement, options: {[value: string]: string;}, initialValue: string): HTMLSelectElement {
  var selectElt = document.createElement('select');
  parentElt.appendChild(selectElt);

  for (var value in options) createSelectOption(selectElt, value, options[value]);

  selectElt.value = initialValue;
  return selectElt;
}

export function createSelectOption(parentElt: HTMLSelectElement, value: string, label: string): HTMLOptionElement {
  var optionElt = document.createElement('option');
  optionElt.value = value;
  optionElt.textContent = label;
  parentElt.appendChild(optionElt);

  return optionElt;
}
