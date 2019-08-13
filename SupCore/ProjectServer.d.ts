/// <reference path="./SupCore.d.ts" />

interface ProjectServer {
  io: SocketIO.Namespace;
  system: SupCore.System;

  data: ProjectServerData;
  projectPath: string;

  addEntry(clientSocketId: string, name: string, type: string, options: any, callback: (err: string, newId?: string) => any): void;
  duplicateEntry(clientSocketId: string, newName: string, originalEntryId: string, options: any, callback: (err: string, duplicatedId?: string) => any): void;
  moveEntry(clientSocketId: string, entryId: string, parentId: string, index: number, callback: (err: string) => any): void;
  trashEntry(clientSocketId: string, entryId: string, callback: (err: string) => any): void;
  renameEntry(clientSocketId: string, entryId: string, name: string, callback: (err: string) => any): void;
  saveEntry(clientSocketId: string, entryId: string, revisionName: string, callback: (err: string) => void): void;

  moveAssetFolderToTrash(trashedAssetFolder: string, callback: (err: Error) => any): void;
}

interface ProjectServerData {
  manifest: SupCore.Data.ProjectManifest;
  entries: SupCore.Data.Entries;

  assets: SupCore.Data.Assets;
  rooms: SupCore.Data.Rooms;
  resources: SupCore.Data.Resources;
}
