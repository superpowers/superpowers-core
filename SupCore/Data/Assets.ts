import * as SupData from "./index";
import * as fs from "fs";
import * as path from "path";

export default class Assets extends SupData.Base.Dictionary {

  byId: { [id: string]: SupCore.Data.Base.Asset };

  constructor(public server: ProjectServer) {
    super();
  }

  acquire(id: string, owner: any, callback: (err: Error, item: any) => any) {
    if (this.server.data.entries.byId[id] == null || this.server.data.entries.byId[id].type == null) { callback(new Error(`Invalid asset id: ${id}`), null); return; }

    super.acquire(id, owner, callback);
  }

  release(id: string, owner: SupCore.RemoteClient, options?: { skipUnloadDelay: boolean }) {
    if (owner != null) this.byId[id].onClientUnsubscribed(owner.id);

    super.release(id, owner, options);
  }

  _load(id: string) {
    const entry = this.server.data.entries.byId[id];

    const assetClass = this.server.system.data.assetClasses[entry.type];
    if (assetClass == null) throw new Error(`No data plugin for asset type "${entry.type}"`);

    const asset = new assetClass(id, null, this.server);

    // NOTE: The way assets are laid out on disk was changed in Superpowers 0.11
    const oldDirPath = path.join(this.server.projectPath, `assets/${id}`);
    fs.stat(oldDirPath, (err, stats) => {
      const dirPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(id)}`);

      if (stats == null) asset.load(dirPath);
      else {
        fs.rename(oldDirPath, dirPath, (err) => {
          if (err != null) throw err;
          asset.load(dirPath);
        });
      }
    });
    return asset;
  }
}
