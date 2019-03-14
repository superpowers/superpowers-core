/// <reference path="../SupCore/SupCore.d.ts" />
/// <reference path="./typings/SupClient.html.d.ts" />
/// <reference path="./typings/SupApp.d.ts" />
/// <reference types="dnd-tree-view" />

declare namespace SupClient {
  export const namePattern: string;

  export const query: { project: string; asset: string; [key: string]: string; };
  export const cookies: Cookies.CookiesStatic;

  export function fetch(url: string, responseType: string, callback: (err: Error, data: any) => void): void;
  export function loadScript(url: string, callback: Function): void;
  export function readFile(file: File, type: string, callback: (err: Error, data: any) => void): void;

  export function registerPlugin<T>(contextName: string, pluginName: string, plugin: T): void;
  export function getPlugins<T>(contextName: string): { [pluginName: string]: { path: string; content: T; } };

  export function connect(projectId: string, options?: { reconnection: boolean; }): SocketIOClient.Socket;
  export function onAssetTrashed(): void;
  export function onDisconnected(): void;
  export function setupHelpCallback(callback: Function): void;

  export function getTreeViewInsertionPoint(treeView: TreeView): { parentId: string; index: number };
  export function getTreeViewSiblingInsertionPoint(treeView: TreeView): { parentId: string, index: number };

  export function getTreeViewDropPoint(dropLocation: { target: HTMLLIElement | HTMLOListElement; where: string; }, treeById: SupCore.Data.Base.TreeById): { parentId: string; index: number };
  export function getListViewDropIndex(dropLocation: { target: HTMLLIElement | HTMLOListElement; where: string; }, listById: SupCore.Data.Base.ListById, reversed?: boolean): number;
  export function findEntryByPath(entries: any, path: string | string[]): any;

  export function openEntry(entryId: string, state?: any): void;
  export function setEntryRevisionDisabled(disabled: boolean): void;

  export function setupCollapsablePane(pane: HTMLDivElement, refreshCallback?: Function): void;

  namespace table {

    interface RowParts {
      row: HTMLTableRowElement;
      labelCell: HTMLTableHeaderCellElement;
      valueCell: HTMLTableDataCellElement;
      checkbox?: HTMLInputElement;
    }

    interface NumberOptions {
      min?: number | string;
      max?: number | string;
      step?: number | string;
    }

    interface SliderOptions extends NumberOptions { sliderStep?: number | string; }

    export function createTable(parent?: HTMLElement): { table: HTMLTableElement; tbody: HTMLTableSectionElement; };
    export function appendRow(parentTableBody: HTMLTableSectionElement, name: string,
      options?: { checkbox?: boolean; title?: string; }): RowParts;
    export function appendHeader(parentTableBody: HTMLTableSectionElement, text: string): HTMLTableRowElement;
    export function appendTextField(parentCell: HTMLElement, value: string): HTMLInputElement;
    export function appendTextAreaField(parent: HTMLElement, value: string): HTMLTextAreaElement;
    export function appendNumberField(parentCell: HTMLElement, value: number | string,
      options?: NumberOptions): HTMLInputElement;
    export function appendNumberFields(parentCell: HTMLElement, values: (number | string)[],
      options?: NumberOptions): HTMLInputElement[];
    export function appendBooleanField(parentCell: HTMLElement, value: boolean): HTMLInputElement;
    export function appendSelectBox(parentCell: HTMLElement,
      options: { [value: string]: string; }, initialValue?: string): HTMLSelectElement;
    export function appendSelectOption(parent: HTMLSelectElement | HTMLOptGroupElement, value: string, label: string): HTMLOptionElement;
    export function appendSelectOptionGroup(parent: HTMLSelectElement | HTMLOptGroupElement, label: string): HTMLOptGroupElement;
    export function appendSliderField(parent: HTMLElement, value: number | string,
      options?: SliderOptions): { sliderField: HTMLInputElement; numberField: HTMLInputElement; };

    export class ColorField extends SupCore.EventEmitter {
      constructor(textField: HTMLInputElement, pickerField: HTMLInputElement);
      setValue(color: string): void;
      setDisabled(disabled: boolean): void;
    }
    export function appendColorField(parent: HTMLElement, value: string): ColorField;

    class AssetFieldSubscriber extends SupCore.EventEmitter {
      entries: SupCore.Data.Entries;

      constructor(assetId: string, projectClient: ProjectClient, callback: (assetId: string) => void);
      destroy(): void;
      selectAssetId(assetId: string): void;
      onChangeAssetId(assetId: string): void;
    }
    export function appendAssetField(parent: HTMLElement, assetId: string, assetType: string, projectClient: SupClient.ProjectClient): AssetFieldSubscriber;
  }

  namespace Dialogs {
    export function cancelDialogIfAny(): void;
    export abstract class BaseDialog<T> {
      static activeDialog: BaseDialog<any>;
      static defaultLabels: { [key: string]: string };

      protected dialogElt: HTMLDivElement;
      protected formElt: HTMLFormElement;
      protected validateButtonElt: HTMLButtonElement;
      protected callback: Function;

      constructor(callback: (result: T) => void);
      protected submit(result?: T): void;
      protected cancel(result?: T): void;
      protected dismiss(): void;
    }

    interface ConfirmOptions {
      header?: string;
      validationLabel?: string;
      cancelLabel?: string;
      checkboxLabel?: string;
    }
    type ConfirmResult = boolean;
    export class ConfirmDialog extends BaseDialog<ConfirmResult> {
      constructor(label: string, options?: ConfirmOptions, callback?: (result: ConfirmResult) => any);
    }

    interface InfoOptions {
      header?: string;
      closeLabel?: string;
    }
    export class InfoDialog extends BaseDialog<any> {
      constructor(label: string, options?: InfoOptions, callback?: () => any);
    }

    interface PromptOptions {
      header?: string;
      validationLabel?: string;
      cancelLabel?: string;
      type?: string;
      initialValue?: string;
      placeholder?: string;
      pattern?: string;
      title?: string;
      required?: boolean;
    }
    type PromptResult = string;
    export class PromptDialog extends BaseDialog<PromptResult> {
      constructor(label: string, options?: PromptOptions, callback?: (result: PromptResult) => void);
    }

    interface SelectOptions {
      header?: string;
      validationLabel?: string;
      cancelLabel?: string;
      size?: number;
    }
    type SelectResult = string;
    export class SelectDialog extends BaseDialog<SelectResult> {
      selectElt: HTMLSelectElement;

      constructor(label: string, choices: { [value: string]: string; }, options?: SelectOptions, callback?: (result: SelectResult) => void)
    }

    type FindAssetResult = string;
    export class FindAssetDialog extends BaseDialog<FindAssetResult> {
      constructor(entries: SupCore.Data.Entries, editorsByAssetType: { [assetType: string]: { pluginPath: string; } }, callback: (result: FindAssetResult) => void)
    }
  }

  namespace i18n {
    export const languageIds: string[];

    export interface File {
      root: string;
      name: string;
      context?: string;
    }

    export function load(files: File[], callback: Function): void;
    export function t(key: string, variables?: { [key: string]: string | number }): string;
  }

  class ProjectClient {
    id: string;
    socket: SocketIOClient.Socket;

    entries: SupCore.Data.Entries;
    entriesSubscribers: EntriesSubscriber[];

    assetsById: { [assetId: string]: SupCore.Data.Base.Asset };
    subscribersByAssetId: { [assetId: string]: AssetSubscriber[] };

    resourcesById: { [resourceId: string]: SupCore.Data.Base.Resource };
    subscribersByResourceId: { [assetId: string]: ResourceSubscriber[] };

    constructor(socket: SocketIOClient.Socket, options?: { subEntries: boolean; });

    subEntries(subscriber: EntriesSubscriber): void;
    unsubEntries(subscriber: EntriesSubscriber): void;

    subAsset(assetId: string, assetType: string, subscriber: AssetSubscriber): void;
    unsubAsset(assetId: string, subscriber: AssetSubscriber): void;
    editAsset(assetId: string, command: string, ...args: any[]): void;
    editAssetNoErrorHandling(assetId: string, command: string, ...args: any[]): void;
    getAssetRevision(assetId: string, assetType: string, revisionId: string, onRevisionReceivedCallback: (assetId: string, asset: SupCore.Data.Base.Asset) => void): void;

    subResource(resourceId: string, subscriber: ResourceSubscriber): void;
    unsubResource(resourceId: string, subscriber: ResourceSubscriber): void;
    editResource(resourceId: string, command: string, ...args: any[]): void;
  }

  interface EntriesSubscriber {
    onEntriesReceived(entries: SupCore.Data.Entries): void;
    onEntryAdded?(entry: any, parentId: string, index: number): void;
    onEntryMoved?(id: string, parentId: string, index: number): void;
    onSetEntryProperty?(id: string, key: string, value: any): void;
    onEntrySaved?(assetId: string, revisionId: string, revisionName: string): void;
    onEntryTrashed?(id: string): void;
  }

  interface AssetSubscriber {
    onAssetReceived?(assetId: string, asset: SupCore.Data.Base.Asset): void;
    onAssetEdited?(assetId: string, command: string, ...args: any[]): void;
    onAssetRestored?(assetId: string, asset: SupCore.Data.Base.Asset): void;
    onAssetTrashed?(assetId: string): void;
  }

  interface ResourceSubscriber {
    onResourceReceived?(resourceId: string, resource: SupCore.Data.Base.Resource): void;
    onResourceEdited?(resourceId: string, command: string, ...args: any[]): void;
  }

  export interface BuildSettingsEditor {
    setVisible(visible: boolean): void;
    getSettings(callback: (settings: any) => void): void;
  }

  interface BuildSettingsEditorConstructor {
    new(container: HTMLDivElement, entries: SupCore.Data.Entries, entriesTreeView: TreeView): BuildSettingsEditor;
  }

  export interface BuildPlugin {
    settingsEditor: BuildSettingsEditorConstructor;
    build: (socket: SocketIOClient.Socket, settings: any, projectWindowId: number, buildPort: number) => void;
  }
}
