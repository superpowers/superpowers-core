type ChooseFolderCallback = (folder: string) => void;
type ChooseFileCallback = (filename: string) => void;

declare namespace SupApp {
  export function onMessage(messageType: string, callback: Function): void;

  export function getCurrentWindow(): Electron.BrowserWindow;
  export function showMainWindow(): void;

  export function openWindow(url: string, options?: OpenWindowOptions): Electron.BrowserWindow;
  interface OpenWindowOptions {
    size?: { width: number; height: number; };
    minSize?: { width: number; height: number; };
    resizable?: boolean;
  }

  export function openLink(url: string): void;
  export function showItemInFolder(path: string): void;

  export function createMenu(): Electron.Menu;
  export function createMenuItem(options: Electron.MenuItemOptions): Electron.MenuItem;

  export namespace clipboard {
    export function copyFromDataURL(dataURL: string): void;
  }

  export function chooseFolder(callback: ChooseFolderCallback): void;
  export function chooseFile(access: "readWrite"|"execute", callback: ChooseFileCallback): void;
  export function tryFileAccess(filePath: string, access: "readWrite"|"execute", callback: (err: Error) => void): void;

  export function mkdirp(folderPath: string, callback: (err: Error) => void): void;
  export function mktmpdir(callback: (err: Error, path: string) => void): void;
  export function writeFile(filename: string, data: any, callback: (err: NodeJS.ErrnoException) => void): void;
  export function writeFile(filename: string, data: any, options: any, callback: (err: NodeJS.ErrnoException) => void): void;
  export function spawnChildProcess(filename: string, args: string[], callback: (err: Error, childProcess?: any) => void): void;
}
