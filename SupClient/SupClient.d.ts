/// <reference path="./typings/socket.io-client/socket.io-client.d.ts" />

declare namespace SupClient {

  interface ComponentEditorObject {
    destroy(): void;
    config_setProperty(path: string, value: any): void;
  }
  interface ComponentEditorClass {
    new(tbody: HTMLTableSectionElement, config: any, projectClient: ProjectClient, editConfig: Function): ComponentEditorObject
  }
  let componentEditorClasses: { [name: string]: ComponentEditorClass };
  function registerComponentEditorClass(name: string, plugin: ComponentEditorClass): void;

  interface SettingsEditorClass {
    new (container: HTMLDivElement, projectClient: ProjectClient): {};
  }
  let settingsEditorClasses: { [name: string]: SettingsEditorClass };
  function registerSettingsEditorClass(name: string, plugin: SettingsEditorClass): void;

  let pluginPaths: { all: string[], editorsByAssetType: { [assetType: string]: any }, toolsByName: { [toolName: string]: any } };

  function connect(projectId: string, options?: {reconnection: boolean; promptCredentials: boolean;}): SocketIOClient.Socket;
  function onAssetTrashed(): void;
  function onDisconnected(): void;
  function setupHotkeys(): void;
  function getTreeViewInsertionPoint(treeView: any): { parentId: string; index: number };

  function getTreeViewDropPoint(dropInfo: any, treeById: SupCore.data.base.TreeById): { parentId: string; index: number };
  function getListViewDropIndex(dropInfo: any, listById: SupCore.data.base.ListById, reversed?: boolean): number;
  function findEntryByPath(entries: any, path: string|string[]): any;

  namespace table {

    interface RowParts {
      row: HTMLTableRowElement;
      labelCell: HTMLTableHeaderCellElement;
      valueCell: HTMLTableDataCellElement;
      checkbox?: HTMLInputElement;
    }

    function createTable(parent?: HTMLElement): { table: HTMLTableElement; tbody: HTMLTableSectionElement; };
    function appendRow(parentTableBody: HTMLTableSectionElement, name: string, options?: { checkbox?: boolean; title?: string; }): RowParts;
    function appendHeader(parentCell: HTMLElement, text: string): HTMLTableRowElement;
    function appendTextField(parentCell: HTMLElement, value: string): HTMLInputElement;
    function appendTextAreaField(parent: HTMLElement, value: string): HTMLTextAreaElement;
    function appendNumberField(parentCell: HTMLElement, value: number|string, min?: number|string, max?: number|string, step?: number|string): HTMLInputElement;
    function appendNumberFields(parentCell: HTMLElement, values: (number|string)[], min?: number|string, max?: number|string, step?: number|string): HTMLInputElement[];
    function appendBooleanField(parentCell: HTMLElement, value: boolean): HTMLInputElement;
    function appendSelectBox(parentCell: HTMLElement, options: { [value: string]: string; }, initialValue?: string): HTMLSelectElement;
    function appendSelectOption(parentCell: HTMLSelectElement, value: string, label: string): HTMLOptionElement;
    function appendColorField(parent: HTMLElement, value: string): { textField: HTMLInputElement; pickerField: HTMLInputElement; };
    function appendAssetField(parent: HTMLElement, value: string): { textField: HTMLInputElement; buttonElt: HTMLButtonElement; };
  }

  namespace dialogs {
    function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
      options: { type?: string; pattern?: string; title?: string; required?: boolean; }|((value: string) => any), callback: (value: string) => any): void;
    function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
      callback: (value: string) => any): void;
    function confirm(label: string, validationLabel: string, callback: (value: boolean) => any): void;
    function info(label: string, validationLabel: string, callback: () => any): void;
    function select(label: string, choices: {[value: string]: string}, validationLabel: string, options: { size?: number; }, callback: (value: string) => any): void;
    function filter(list: string[], placeholder: string, callback: (value: string) => any): void;
  }

  class ProjectClient {
    socket: SocketIOClient.Socket;

    entries: SupCore.data.Entries;
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
  onEntriesReceived(entries: SupCore.data.Entries): void;
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
