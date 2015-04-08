/// <reference path="./typings/socket.io-client/socket.io-client.d.ts" />

declare module SupClient {
  var pluginPaths: string;

  function connect(projectId: string, options?: {reconnection: boolean; promptCredentials: boolean;}): SocketIOClient.Socket;
  function onAssetTrashed(): void;
  function onDisconnected(): void;
  function setupHotkeys(): void;
  function getTreeViewInsertionPoint(treeView: any): { parentId: number; index: number };

  function getTreeViewDropPoint(dropInfo: any, treeById: SupCore.data.base.TreeById): { parentId: number; index: number };
  function getListViewDropIndex(dropInfo: any, listById: SupCore.data.base.ListById): number;
  function findEntryByPath(entries: any, path: string|string[]): any;

  module component {
    function createSetting(parentElt: HTMLDivElement, name: string, options?: {checkbox?: boolean; title?: string;}):
      {rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;};
    function createTextField(parentElt: HTMLTableDataCellElement, value: string): HTMLInputElement;
    function createNumberField(parentElt: HTMLTableDataCellElement, value: any, min?: any, max?: any): HTMLInputElement;
    function createBooleanField(parentElt: HTMLTableDataCellElement, value: boolean): HTMLInputElement;
    function createSelectBox(parentElt: HTMLTableDataCellElement, options: {[value: string]: string;}, initialValue?: string): HTMLSelectElement;
    function createSelectOption(parentElt: HTMLSelectElement, value: string, label: string): HTMLOptionElement;
  }

  module dialogs {
    function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
      options: {type?: string; pattern?: string;}|((value: string) => any), callback: (value: string) => any): void;
    function prompt(label: string, placeholder: string, initialValue: string, validationLabel: string,
      callback: (value: string) => any): void;
    function confirm(label: string, validationLabel: string, callback: (value: boolean) => any): void;
    function info(label: string, validationLabel: string, callback: () => any): void;
    function select(label: string, options: {[value: string]: string}, validationLabel: string, callback: (value: string) => any): void;
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

    constructor(socket: SocketIOClient.Socket, options: {subEntries: boolean});

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
