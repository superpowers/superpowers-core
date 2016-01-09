/// <reference path="../SupCore/SupCore.d.ts" />
/// <reference path="./typings/socket.io-client/socket.io-client.d.ts" />

declare namespace SupClient {
  export const namePattern: string;

  export let isApp: boolean;
  export let query: { project: string, asset: string; [key: string]: string; };
  export let cookies: Cookies.CookiesStatic;

  export function fetch(url: string, responseType: string, callback: (err: Error, data: any) => any): void;

  export let activePluginPath: string;
  export let plugins: { [context: string]: { [name: string]: { path: string; content: any; } } };
  export function registerPlugin(context: string, name: string, plugin: any): void;

  export function connect(projectId: string, options?: { reconnection: boolean; }): SocketIOClient.Socket;
  export function onAssetTrashed(): void;
  export function onDisconnected(): void;
  export function setupHotkeys(): void;
  export function setupHelpCallback(callback: Function): void;
  export function getTreeViewInsertionPoint(treeView: any): { parentId: string; index: number };

  export function getTreeViewDropPoint(dropInfo: any, treeById: SupCore.Data.Base.TreeById): { parentId: string; index: number };
  export function getListViewDropIndex(dropInfo: any, listById: SupCore.Data.Base.ListById, reversed?: boolean): number;
  export function findEntryByPath(entries: any, path: string|string[]): any;

  export function setupCollapsablePane(pane: HTMLDivElement, refreshCallback?: Function): void;

  namespace table {

    interface RowParts {
      row: HTMLTableRowElement;
      labelCell: HTMLTableHeaderCellElement;
      valueCell: HTMLTableDataCellElement;
      checkbox?: HTMLInputElement;
    }

    interface NumberOptions {
      min?: number|string;
      max?: number|string;
      step?: number|string;
    }

    interface SliderOptions extends NumberOptions { sliderStep?: number|string; }

    export function createTable(parent?: HTMLElement): { table: HTMLTableElement; tbody: HTMLTableSectionElement; };
    export function appendRow(parentTableBody: HTMLTableSectionElement, name: string,
    options?: { checkbox?: boolean; title?: string; }): RowParts;
    export function appendHeader(parentTableBody: HTMLTableSectionElement, text: string): HTMLTableRowElement;
    export function appendTextField(parentCell: HTMLElement, value: string): HTMLInputElement;
    export function appendTextAreaField(parent: HTMLElement, value: string): HTMLTextAreaElement;
    export function appendNumberField(parentCell: HTMLElement, value: number|string,
    options?: NumberOptions): HTMLInputElement;
    export function appendNumberFields(parentCell: HTMLElement, values: (number|string)[],
    options?: NumberOptions): HTMLInputElement[];
    export function appendBooleanField(parentCell: HTMLElement, value: boolean): HTMLInputElement;
    export function appendSelectBox(parentCell: HTMLElement,
    options: { [value: string]: string; }, initialValue?: string): HTMLSelectElement;
    export function appendSelectOption(parent: HTMLSelectElement|HTMLOptGroupElement, value: string, label: string): HTMLOptionElement;
    export function appendSelectOptionGroup(parent: HTMLSelectElement|HTMLOptGroupElement, label: string): HTMLOptGroupElement;
    export function appendColorField(parent: HTMLElement, value: string): { textField: HTMLInputElement; pickerField: HTMLInputElement; };
    export function appendSliderField(parent: HTMLElement, value: number|string,
    options?: SliderOptions): { sliderField: HTMLInputElement; numberField: HTMLInputElement; };
    export function appendAssetField(parent: HTMLElement, value: string): { textField: HTMLInputElement; buttonElt: HTMLButtonElement; };
  }

  namespace dialogs {
    interface PromptOptions {
      type?: string;
      initialValue?: string;
      placeholder?: string;
      pattern?: string;
      title?: string;
      required?: boolean;
      validationLabel?: string;
      cancelLabel?: string;
    }

    interface SelectOptions {
      size?: number;
    }

    export abstract class BaseDialog {
      protected dialogElt: HTMLDivElement;
      protected formElt: HTMLFormElement;
      protected validateButtonElt: HTMLButtonElement;

      protected submit(): boolean;
      protected cancel(): void;
    }

    export function cancelDialogIfAny(): void;

    export class PromptDialog {
      constructor(label: string, options?: PromptOptions, callback?: (value: string) => any);
    }
    export class ConfirmDialog {
      constructor(label: string, validationLabel: string, callback: (confirmed: boolean) => any);
    }
    export class InfoDialog {
      constructor(label: string, validationLabel: string, callback?: () => any);
    }
    export class SelectDialog {
      constructor(label: string, choices: { [value: string]: string; }, validationLabel: string, options: SelectOptions, callback: (value: string) => any);
    }
  }

  namespace i18n {
    export let languageIds: string[];

    export interface File {
      root: string;
      name: string;
      context?: string;
    }

    export function load(files: File[], callback: Function): void;
    export function t(key: string, variables?: { [key: string]: string }): string;
  }

  class ProjectClient {
    socket: SocketIOClient.Socket;

    entries: SupCore.Data.Entries;
    entriesSubscribers: EntriesSubscriber[];

    assetsById: {[assetId: string]: any};
    subscribersByAssetId: {[assetId: string]: AssetSubscriber[]};

    resourcesById: {[resourceId: string]: any};
    subscribersByResourceId: {[assetId: string]: ResourceSubscriber[]};

    constructor(socket: SocketIOClient.Socket, options?: { subEntries: boolean; });

    subEntries(subscriber: EntriesSubscriber): void;
    unsubEntries(subscriber: EntriesSubscriber): void;

    subAsset(assetId: string, assetType: string, subscriber: AssetSubscriber): void;
    unsubAsset(assetId: string, subscriber: AssetSubscriber): void;
    subResource(resourceId: string, subscriber: ResourceSubscriber): void;
    unsubResource(resourceId: string, subscriber: ResourceSubscriber): void;
  }

  interface EntriesSubscriber {
    onEntriesReceived(entries: SupCore.Data.Entries): void;
    onEntryAdded(entry: any, parentId: string, index: number): void;
    onEntryMoved(id: string, parentId: string, index: number): void;
    onSetEntryProperty(id: string, key: string, value: any): void;
    onEntryTrashed(id: string): void;
  }

  interface AssetSubscriber {
    onAssetReceived(assetId: string, asset: any): void;
    onAssetEdited(assetId: string, command: string, ...args: any[]): void;
    onAssetTrashed(assetId: string): void;
  }

  interface ResourceSubscriber {
    onResourceReceived(resourceId: string, resource: any): void;
    onResourceEdited(resourceId: string, command: string, ...args: any[]): void;
  }
}
