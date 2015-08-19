export function createTable(parent?: HTMLElement) {
  let table = document.createElement("table");
  if (parent != null) parent.appendChild(table);

  let tbody = document.createElement("tbody");
  table.appendChild(tbody);

  return { table, tbody };
}

function createInput(type: string, parent?: HTMLElement) {
  let input = document.createElement("input");
  input.type = type;
  if (parent != null) parent.appendChild(input);
  return input;
}

export function appendRow(parentTableBody: HTMLTableSectionElement, name: string, options?: { checkbox?: boolean; title?: string; }) {
  let row = document.createElement("tr");
  parentTableBody.appendChild(row);

  let labelCell = document.createElement("th");
  row.appendChild(labelCell);

  let checkbox: HTMLInputElement;
  if (options != null && options.checkbox) {
    let container = document.createElement("div");
    labelCell.appendChild(container);

    let nameElt = document.createElement("div");
    nameElt.textContent = name;
    nameElt.title = options.title;
    container.appendChild(nameElt);

    checkbox = createInput("checkbox", container);
  } else {
    labelCell.textContent = name;
    if (options != null && options.title != null) labelCell.title = options.title;
  }

  let valueCell = document.createElement("td");
  row.appendChild(valueCell);

  return { row, labelCell, valueCell, checkbox };
}

export function appendTextField(parent: HTMLElement, value: string) {
  let input = createInput("text", parent);
  input.value = value;

  return input;
}

export function appendTextAreaField(parent: HTMLElement, value: string) {
  let textarea = document.createElement("textarea");
  parent.appendChild(textarea);
  textarea.value = value;

  return textarea;
}

export function appendNumberField(parent: HTMLElement, value: number|string, min?: number|string, max?: number|string) {
  let input = createInput("number", parent);
  input.value = <any>value;
  if (min != null) input.min = <any>min;
  if (max != null) input.max = <any>max;

  return input;
}

export function appendNumberFields(parent: HTMLElement, values: (number|string)[], min?: number|string, max?: number|string) {
  let inputsParent = <any>document.createElement("div");
  inputsParent.classList.add("inputs");
  parent.appendChild(inputsParent);

  let inputs: HTMLInputElement[] = [];
  for (let value of values) inputs.push(appendNumberField(inputsParent, value, min, max));
  return inputs;
}

export function appendBooleanField(parent: HTMLElement, value: boolean) {
  let input = createInput("checkbox", parent);
  input.checked = value;

  return input;
}

export function appendSelectBox(parent: HTMLElement, options: { [value: string]: string; }, initialValue="") {
  let selectInput = document.createElement("select");
  parent.appendChild(selectInput);
  for (let value in options) appendSelectOption(selectInput, value, options[value]);
  selectInput.value = initialValue;

  return selectInput;
}

export function appendSelectOption(parent: HTMLSelectElement, value: string, label: string) {
  let option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  parent.appendChild(option);

  return option;
}

export function appendColorField(parent: HTMLElement, value: string) {
  let colorParent = <any>document.createElement("div");
  colorParent.classList.add("inputs");
  parent.appendChild(colorParent);

  let textField = appendTextField(colorParent, value);
  textField.classList.add("color");

  let pickerField = document.createElement("input");
  pickerField.style.padding = "0";
  pickerField.style.alignSelf = "center";
  pickerField.type = "color";
  pickerField.value = `#${value}`;
  colorParent.appendChild(pickerField);

  return { textField, pickerField };
}

export function appendAssetField(parent: HTMLElement, value: string) {
  let assetParent = <any>document.createElement("div");
  assetParent.classList.add("inputs");
  parent.appendChild(assetParent);

  let textField = appendTextField(assetParent, value);

  let buttonElt = document.createElement("button");
  buttonElt.textContent = "Open";
  assetParent.appendChild(buttonElt);

  return { textField, buttonElt };
}
