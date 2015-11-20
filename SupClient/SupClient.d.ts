/// <reference path="../SupCore/SupCore.d.ts" />
/// <reference path="./typings/socket.io-client/socket.io-client.d.ts" />

declare namespace SupClient {
  export const namePattern: string;
  export const namePatternDescription: string;

  export let isApp: boolean;
  export let query: { project: string, asset: string; };
  export let cookies: Cookies.CookiesStatic;

  interface ComponentEditorObject {
    destroy(): void;
    config_setProperty(path: string, value: any): void;
  }
  interface ComponentEditorClass {
    new(tbody: HTMLTableSectionElement, config: any, projectClient: ProjectClient, editConfig: Function): ComponentEditorObject;
  }
  export let componentEditorClasses: { [name: string]: ComponentEditorClass };
  export function registerComponentEditorClass(name: string, plugin: ComponentEditorClass): void;

  interface SettingsEditorClass {
    new (container: HTMLDivElement, projectClient: ProjectClient): {};
  }
  export let settingsEditorClasses: { [name: string]: SettingsEditorClass };
  export function registerSettingsEditorClass(name: string, plugin: SettingsEditorClass): void;

  export function connect(projectId: string, options?: { reconnection: boolean; }): SocketIOClient.Socket;
  export function onAssetTrashed(): void;
  export function onDisconnected(): void;
  export function setupHotkeys(): void;
  export function getTreeViewInsertionPoint(treeView: any): { parentId: string; index: number };

  export function getTreeViewDropPoint(dropInfo: any, treeById: SupCore.Data.Base.TreeById): { parentId: string; index: number };
  export function getListViewDropIndex(dropInfo: any, listById: SupCore.Data.Base.ListById, reversed?: boolean): number;
  export function findEntryByPath(entries: any, path: string|string[]): any;

  namespace table {

    interface RowParts {
      row: HTMLTableRowElement;
      labelCell: HTMLTableHeaderCellElement;
      valueCell: HTMLTableDataCellElement;
      checkbox?: HTMLInputElement;
    }

    export function createTable(parent?: HTMLElement): { table: HTMLTableElement; tbody: HTMLTableSectionElement; };
    export function appendRow(parentTableBody: HTMLTableSectionElement, name: string,
    options?: { checkbox?: boolean; title?: string; }): RowParts;
    export function appendHeader(parentTableBody: HTMLTableSectionElement, text: string): HTMLTableRowElement;
    export function appendTextField(parentCell: HTMLElement, value: string): HTMLInputElement;
    export function appendTextAreaField(parent: HTMLElement, value: string): HTMLTextAreaElement;
    export function appendNumberField(parentCell: HTMLElement, value: number|string,
    min?: number|string, max?: number|string, step?: number|string): HTMLInputElement;
    export function appendNumberFields(parentCell: HTMLElement, values: (number|string)[],
    min?: number|string, max?: number|string, step?: number|string): HTMLInputElement[];
    export function appendBooleanField(parentCell: HTMLElement, value: boolean): HTMLInputElement;
    export function appendSelectBox(parentCell: HTMLElement, options: { [value: string]: string; },
    initialValue?: string): HTMLSelectElement;
    export function appendSelectOption(parentCell: HTMLSelectElement, value: string, label: string): HTMLOptionElement;
    export function appendColorField(parent: HTMLElement, value: string): { textField: HTMLInputElement; pickerField: HTMLInputElement; };
    export function appendAssetField(parent: HTMLElement, value: string): { textField: HTMLInputElement; buttonElt: HTMLButtonElement; };
  }

  namespace dialogs {
    interface PromptOptions {
      type?: string;
      pattern?: string;
      title?: string;
      required?: boolean;
    }

    export function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
      options: PromptOptions|((value: string) => any), callback: (value: string) => any): void;
    export function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
      callback: (value: string) => any): void;
    export function confirm(label: string, validationLabel: string, callback: (value: boolean) => any): void;
    export function info(label: string, validationLabel: string, callback: () => any): void;
    export function select(label: string, choices: { [value: string]: string; },
    validationLabel: string, options: { size?: number; }, callback: (value: string) => any): void;
    export function filter(list: string[], placeholder: string, callback: (value: string) => any): void;
  }

  class ProjectClient {
    socket: SocketIOClient.Socket;

    entries: SupCore.Data.Entries;
    entriesSubscribers: EntriesSubscriber[];

    assetsById: {[assetId: string]: any};
    subscribersByAssetId: {[assetId: string]: AssetSubscriber[]};

    resourcesById: {[resourceId: string]: any};
    subscribersByResourceId: {[assetId: string]: ResourceSubscriber[]};

    constructor(socket: SocketIOClient.Socket, options?: {subEntries: boolean});

    subEntries(subscriber: EntriesSubscriber): void;
    unsubEntries(subscriber: EntriesSubscriber): void;

    subAsset(assetId: string, assetType: string, subscriber: AssetSubscriber): void;
    unsubAsset(assetId: string, subscriber: AssetSubscriber): void;
    subResource(resourceId: string, subscriber: ResourceSubscriber): void;
    unsubResource(resourceId: string, subscriber: ResourceSubscriber): void;
  }
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
