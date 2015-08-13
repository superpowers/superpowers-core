import * as SupData from "./index";
import * as fs from "fs";
import * as path from "path";
import * as async from "async";

export default class Assets extends SupData.base.Dictionary {
  server: ProjectServer;

  constructor(server: ProjectServer) {
    super();
    this.server = server;
  }

  acquire(id: string, owner: any, callback: (err: Error, item: any) => any) {
    if (this.server.data.entries.byId[id] == null || this.server.data.entries.byId[id].type == null) { callback(new Error(`Invalid asset id: ${id}`), null); return; }

    super.acquire(id, owner, callback);
  }

  _load(id: string) {
    let entry = this.server.data.entries.byId[id];

    let assetClass = SupData.assetClasses[entry.type];
    if (assetClass == null) throw new Error(`No data plugin for asset type "${entry.type}"`);

    let asset = new assetClass(id, null, this.server.data);

    // Remove these at some point, asset migration from Superpowers 0.11
    let oldDirPath = path.join(this.server.projectPath, `assets/${id}`);
    fs.stat(oldDirPath, (err, stats) => {
      let dirPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(id)}`);

      if (stats == null) asset.load(dirPath);
      else {
        fs.rename(oldDirPath, dirPath, (err) => {
          if (err != null) throw err;
          asset.load(dirPath);
        });
      }
    })
    return asset;
  }
}
