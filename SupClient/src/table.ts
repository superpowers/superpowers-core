import html from "./html";

export function createTable(parent?: HTMLElement) {
  const table = html("table", { parent });
  const tbody = html("tbody", { parent: table });
  return { table, tbody };
}

export function appendRow(parentTableBody: HTMLTableSectionElement, name: string, options?: { checkbox?: boolean; title?: string; }) {
  const row = html("tr", { parent: parentTableBody});
  const labelCell = html("th", { parent: row });

  let checkbox: HTMLInputElement;
  if (options != null && options.checkbox) {
    const container = html("div", { parent: labelCell });
    html("div", { parent: container, textContent: name, title: options.title });
    checkbox = html("input", { parent: container, type: "checkbox" }) as HTMLInputElement;
  } else {
    labelCell.textContent = name;
    if (options != null && options.title != null) labelCell.title = options.title;
  }

  const valueCell = html("td", { parent: row });

  return { row, labelCell, valueCell, checkbox };
}

export function appendHeader(parentTableBody: HTMLTableSectionElement, text: string) {
  const headerRow = html("tr", { parent: parentTableBody });
  html("th", { parent: headerRow, textContent: text, colSpan: 2 });
  return headerRow;
}

export function appendTextField(parent: HTMLElement, value: string) {
  return html("input", { parent, type: "text", value });
}

export function appendTextAreaField(parent: HTMLElement, value: string) {
  return html("textarea", { parent, value });
}

interface NumberOptions {
  min?: number|string;
  max?: number|string;
  step?: number|string;
};

export function appendNumberField(parent: HTMLElement, value: number|string, options?: NumberOptions) {
  const input = html("input", { parent, type: "number", value: value.toString() }) as HTMLInputElement;

  if (options != null) {
    if (options.min != null) input.min = options.min.toString();
    if (options.max != null) input.max = options.max.toString();
    if (options.step != null) input.step = options.step.toString();
  }

  return input;
}

export function appendNumberFields(parent: HTMLElement, values: (number|string)[], options?: NumberOptions) {
  const inputsParent = html("div", "inputs", { parent });

  const inputs: HTMLInputElement[] = [];
  for (const value of values) inputs.push(appendNumberField(inputsParent, value, options));
  return inputs;
}

export function appendBooleanField(parent: HTMLElement, checked: boolean) {
  return html("input", { parent, type: "checkbox", checked });
}

export function appendSelectBox(parent: HTMLElement, options: { [value: string]: string; }, initialValue = "") {
  const selectInput = html("select", { parent }) as HTMLSelectElement;
  for (const value in options) appendSelectOption(selectInput, value, options[value]);
  selectInput.value = initialValue;

  return selectInput;
}

export function appendSelectOption(parent: HTMLSelectElement|HTMLOptGroupElement, value: string, label: string) {
  return html("option", { parent, value, textContent: label });
}

export function appendSelectOptionGroup(parent: HTMLSelectElement|HTMLOptGroupElement, label: string) {
  return html("optgroup", { parent, label, textContent: label });
}

export function appendColorField(parent: HTMLElement, value: string) {
  const colorParent = html("div", "inputs", { parent });

  const textField = appendTextField(colorParent, value);
  textField.classList.add("color");

  const pickerField = html("input", { parent: colorParent, type: "color", value: `#${value}` });

  return { textField, pickerField };
}

interface SliderOptions extends NumberOptions { sliderStep?: number|string; }

export function appendSliderField(parent: HTMLElement, value: number|string, options?: SliderOptions) {
  const sliderParent = html("div", "inputs", { parent });

  const sliderField = html("input", { parent: sliderParent, type: "range", value: value.toString(), style: { flex: "2" } }) as HTMLInputElement;
  if (options != null) {
    if (options.min != null) sliderField.min = options.min.toString();
    if (options.max != null) sliderField.max = options.max.toString();
    if (options.sliderStep != null) sliderField.step = options.sliderStep.toString();
  }

  const numberField = appendNumberField(sliderParent, value, options);

  return { sliderField, numberField };
}

export function appendAssetField(parent: HTMLElement, value: string) {
  const assetParent = html("div", "inputs", { parent });

  const textField = appendTextField(assetParent, value);
  const buttonElt = html("button", { parent: assetParent, textContent: SupClient.i18n.t("common:actions.open") });

  return { textField, buttonElt };
}
