type ChooseFolderCallback = (err: string, folder: string) => void;

interface PublishOptions {
  projectId: string; buildId: string;
  baseURL: string; mainPort: number; buildPort: number;
  outputFolder: string; files: string[];
}

declare namespace SupApp {
  export function getCurrentWindow(): GitHubElectron.BrowserWindow;
  export function getIpc(): GitHubElectron.IpcRenderer;

  export function showMainWindow(): void;
  export function openWindow(url: string): GitHubElectron.BrowserWindow;
  export function openLink(url: string): void;
  export function showItemInFolder(path: string): void;

  export function createMenu(): GitHubElectron.Menu;
  export function createMenuItem(options: GitHubElectron.MenuItemOptions): GitHubElectron.MenuItem;

  export namespace clipboard {
    export function copyFromDataURL(dataURL: string): void;
  }

  export function chooseFolder(callback: ChooseFolderCallback): void;
  export function publishProject(options: PublishOptions): void;
}
