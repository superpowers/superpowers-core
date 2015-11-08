/// <reference path="./SupCore.d.ts" />

interface ProjectServer {
  io: SocketIO.Namespace;
  system: SupCore.System;

  data: ProjectServerData;
  projectPath: string;

  moveAssetFolderToTrash(trashedAssetFolder: string, callback: (err: Error) => any): void;
}

interface ProjectServerData {
  manifest: SupCore.Data.Manifest;
  entries: SupCore.Data.Entries;

  assets: SupCore.Data.Assets;
  rooms: SupCore.Data.Rooms;
  resources: SupCore.Data.Resources;
}
