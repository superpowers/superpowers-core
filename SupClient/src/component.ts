export function createSetting(parentElt: HTMLDivElement, name: string, options?: {checkbox?: boolean; title?: string;}):
{rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;} {
  let rowElt = document.createElement('tr');
  parentElt.appendChild(rowElt);

  let keyElt = document.createElement('th');
  rowElt.appendChild(keyElt);

  let checkboxElt: HTMLInputElement;
  if (options != null && options.checkbox) {
    let containerElt = document.createElement('div');
    containerElt.className = '';
    keyElt.appendChild(containerElt);

    let nameElt = document.createElement('div');
    nameElt.textContent = name;
    nameElt.title = options.title;
    containerElt.appendChild(nameElt);

    checkboxElt = document.createElement('input');
    checkboxElt.type = 'checkbox';
    containerElt.appendChild(checkboxElt);
  }
  else keyElt.textContent = name;

  let valueElt = document.createElement('td');
  rowElt.appendChild(valueElt);

  return { rowElt, keyElt, valueElt, checkboxElt };
}

export function createTextField(parentElt: HTMLTableDataCellElement, value: string): HTMLInputElement {
  let inputElt = document.createElement('input');
  inputElt.type = 'text';
  parentElt.appendChild(inputElt);

  inputElt.value = value;

  return inputElt;
}

export function createNumberField(parentElt: HTMLTableDataCellElement, value: any, min?: any, max?: any): HTMLInputElement {
  let inputElt = document.createElement('input');
  inputElt.type = 'number';
  parentElt.appendChild(inputElt);

  inputElt.value = value;
  if (min != null ) inputElt.min = min;
  if (max != null) inputElt.max = max;

  return inputElt;
}

export function createBooleanField(parentElt: HTMLTableDataCellElement, value: boolean): HTMLInputElement {
  let inputElt = document.createElement('input');
  inputElt.type = 'checkbox';
  parentElt.appendChild(inputElt);

  inputElt.checked = value;

  return inputElt;
}

export function createSelectBox(parentElt: HTMLTableDataCellElement, options: {[value: string]: string;}, initialValue = ""): HTMLSelectElement {
  let selectElt = document.createElement('select');
  parentElt.appendChild(selectElt);

  for (let value in options) createSelectOption(selectElt, value, options[value]);

  selectElt.value = initialValue;
  return selectElt;
}

export function createSelectOption(parentElt: HTMLSelectElement, value: string, label: string): HTMLOptionElement {
  let optionElt = document.createElement('option');
  optionElt.value = value;
  optionElt.textContent = label;
  parentElt.appendChild(optionElt);

  return optionElt;
}
