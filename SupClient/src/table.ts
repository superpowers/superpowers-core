import { EventEmitter } from "events";
import html from "./html";
import FindAssetDialog from "./FindAssetDialog";

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
  return html("input", { parent, type: "text", value }) as HTMLInputElement;
}

export function appendTextAreaField(parent: HTMLElement, value: string) {
  return html("textarea", { parent, value }) as HTMLTextAreaElement;
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
  return html("input", { parent, type: "checkbox", checked }) as HTMLInputElement;
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

export function appendAssetField(parent: HTMLElement, assetId: string, assetType: string, projectClient: SupClient.ProjectClient) {
  const assetParent = html("div", "inputs", { parent });

  const textField = html("input", { parent: assetParent, type: "text", readOnly: true, style: { cursor: "pointer" } }) as HTMLInputElement;
  const buttonElt = html("button", { parent: assetParent, disabled: true, textContent: SupClient.i18n.t("common:actions.select") }) as HTMLButtonElement;

  let pluginPath: string;

  const assetSubscriber = new AssetFieldSubscriber(assetId, projectClient);
  assetSubscriber.on("change", (assetId: string) => {
    textField.value = assetId == null ? "" : assetSubscriber.entries.byId[assetId] == null ? "???" : assetSubscriber.entries.getPathFromId(assetId);
    buttonElt.textContent = SupClient.i18n.t(`common:actions.${assetId == null ? "select" : "clear"}`);
    buttonElt.disabled = pluginPath == null;
  });

  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    pluginPath = pluginsInfo.paths.editors[assetType];
    if (assetSubscriber.entries != null) buttonElt.disabled = false;
  });

  textField.addEventListener("click", (event) => {
    if (assetSubscriber.assetId != null) {
      SupClient.openEntry(assetSubscriber.assetId);
    } else {
      /* tslint:disable:no-unused-expression */
      new FindAssetDialog(projectClient.entries, { [assetType]: { pluginPath } }, (assetId) => { if (assetId != null) assetSubscriber.selectAssetId(assetId); });
      /* tslint:enable:no-unused-expression */
    }
  });

  textField.addEventListener("dragover", (event) => {
    if (!buttonElt.disabled) event.preventDefault();
  });
  textField.addEventListener("drop", (event) => {
    const entryId = event.dataTransfer.getData("application/vnd.superpowers.entry").split(",")[0];
    if (typeof entryId !== "string") return;

    const entry = assetSubscriber.entries.byId[entryId];
    if (entry == null || entry.type !== assetType) return;

    assetSubscriber.selectAssetId(entryId);
  });

  buttonElt.addEventListener("click", (event) => {
    if (assetSubscriber.assetId != null) {
      assetSubscriber.selectAssetId(null);
      return;
    }

    /* tslint:disable:no-unused-expression */
    new FindAssetDialog(projectClient.entries, { [assetType]: { pluginPath } }, (assetId) => { if (assetId != null) assetSubscriber.selectAssetId(assetId); });
    /* tslint:enable:no-unused-expression */
  });

  return assetSubscriber;
}

class AssetFieldSubscriber extends EventEmitter {
  entries: SupCore.Data.Entries;

  constructor(public assetId: string, private projectClient: SupClient.ProjectClient) {
    super();
    this.projectClient.subEntries(this);
  }

  destroy() {
    this.projectClient.unsubEntries(this);
  }

  onEntriesReceived(entries: SupCore.Data.Entries) {
    this.entries = entries;
    setTimeout(() => { this.emit("change", this.assetId); }, 1);
  }

  onEntryAdded(entry: any, parentId: string, index: number) { /* Nothing to do here */ }
  onEntryMoved(id: string, parentId: string, index: number) {
    this.emit("change", this.assetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (key === "name") this.emit("change", this.assetId);
  }
  onEntryTrashed(id: string) {
    if (id === this.assetId) this.emit("change", this.assetId);
  }

  selectAssetId(assetId: string) {
    this.onChangeAssetId(assetId);
    this.emit("select", assetId);
  }

  onChangeAssetId(assetId: string) {
    this.assetId = assetId;
    this.emit("change", this.assetId);
  }
}
