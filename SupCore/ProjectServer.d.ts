/// <reference path="./SupCore.d.ts" />

interface ProjectServer {
  data: ProjectServerData;
  projectPath: string;

  moveAssetFolderToTrash(trashedAssetFolder: string, callback: (err: Error) => any): void;
}

interface ProjectServerData {
  manifest: SupCore.data.Manifest;
  entries: SupCore.data.Entries;

  assets: SupCore.data.Assets;
  rooms: SupCore.data.Rooms;
  resources: SupCore.data.Resources;
}
