///<reference path="./SupCore.d.ts"/>

interface ProjectServer {
  data: ProjectServerData;
  projectPath: string;
}

interface ProjectServerData {
    manifest: SupCore.data.Manifest;
    internals: SupCore.data.Internals;
    members: SupCore.data.Members;
    entries: SupCore.data.Entries;

    assets: SupCore.data.Assets;
    rooms: SupCore.data.Rooms;
    resources: SupCore.data.Resources;
}
