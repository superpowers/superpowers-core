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

export function appendHeader(parentTableBody: HTMLTableSectionElement, text: string) {
  let headerRow = document.createElement("tr");
  parentTableBody.appendChild(headerRow);

  let headerTh = document.createElement("th");
  headerTh.textContent = text;
  headerTh.colSpan = 2;
  headerRow.appendChild(headerTh);

  return headerRow;
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

interface NumberOptions {
  min?: number|string;
  max?: number|string;
  step?: number|string;
};

export function appendNumberField(parent: HTMLElement, value: number|string, options?: NumberOptions) {
  let input = createInput("number", parent);
  input.value = value.toString();

  if (options != null) {
    if (options.min != null) input.min = options.min.toString();
    if (options.max != null) input.max = options.max.toString();
    if (options.step != null) input.step = options.step.toString();
  }

  return input;
}

export function appendNumberFields(parent: HTMLElement, values: (number|string)[], options?: NumberOptions) {
  let inputsParent = document.createElement("div");
  inputsParent.classList.add("inputs");
  parent.appendChild(inputsParent);

  let inputs: HTMLInputElement[] = [];
  for (let value of values) inputs.push(appendNumberField(inputsParent, value, options));
  return inputs;
}

export function appendBooleanField(parent: HTMLElement, value: boolean) {
  let input = createInput("checkbox", parent);
  input.checked = value;

  return input;
}

export function appendSelectBox(parent: HTMLElement, options: { [value: string]: string; }, initialValue = "") {
  let selectInput = document.createElement("select");
  parent.appendChild(selectInput);
  for (let value in options) appendSelectOption(selectInput, value, options[value]);
  selectInput.value = initialValue;

  return selectInput;
}

export function appendSelectOption(parent: HTMLSelectElement|HTMLOptGroupElement, value: string, label: string) {
  let option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  parent.appendChild(option);

  return option;
}

export function appendSelectOptionGroup(parent: HTMLSelectElement|HTMLOptGroupElement, label: string) {
  let optionGroup = document.createElement("optgroup");
  optionGroup.label = label;
  optionGroup.textContent = label;
  parent.appendChild(optionGroup);

  return optionGroup;
}

export function appendColorField(parent: HTMLElement, value: string) {
  let colorParent = document.createElement("div");
  colorParent.classList.add("inputs");
  parent.appendChild(colorParent);

  let textField = appendTextField(colorParent, value);
  textField.classList.add("color");

  let pickerField = document.createElement("input");
  pickerField.type = "color";
  pickerField.value = `#${value}`;
  colorParent.appendChild(pickerField);

  return { textField, pickerField };
}

interface SliderOptions extends NumberOptions { sliderStep?: number|string; }

export function appendSliderField(parent: HTMLElement, value: number|string, options?: SliderOptions) {
  let sliderParent = document.createElement("div");
  sliderParent.classList.add("inputs");
  parent.appendChild(sliderParent);

  let sliderField = document.createElement("input");
  sliderParent.appendChild(sliderField);
  sliderField.type = "range";
  sliderField.style.flex = "2";
  sliderField.value = value.toString();
  if (options != null) {
    if (options.min != null) sliderField.min = options.min.toString();
    if (options.max != null) sliderField.max = options.max.toString();
    if (options.sliderStep != null) sliderField.step = options.sliderStep.toString();
  }

  let numberField = appendNumberField(sliderParent, value, options);

  return { sliderField, numberField };
}

export function appendAssetField(parent: HTMLElement, value: string) {
  let assetParent = document.createElement("div");
  assetParent.classList.add("inputs");
  parent.appendChild(assetParent);

  let textField = appendTextField(assetParent, value);

  let buttonElt = document.createElement("button");
  buttonElt.textContent = SupClient.i18n.t("common:actions.open");
  assetParent.appendChild(buttonElt);

  return { textField, buttonElt };
}
