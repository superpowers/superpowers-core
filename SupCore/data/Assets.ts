import * as SupData from "./index";
import * as path from "path";

export default class Assets extends SupData.base.Dictionary {
  server: any;

  constructor(server: any) {
    super();
    this.server = server;
  }

  acquire(id: string, owner: any, callback: (err: Error) => any) {
    if (this.server.data.entries.byId[id] == null || this.server.data.entries.byId[id].type == null) { callback(new Error(`Invalid asset id: ${id}`)); return; }

    super.acquire(id, owner, callback);
  }

  _load(id: string) {
    let entry = this.server.data.entries.byId[id];

    let assetClass = SupData.assetClasses[entry.type];
    if (assetClass == null) throw new Error(`No data plugin for asset type "${entry.type}"`);

    let asset = new assetClass(id, null, this.server.data);
    asset.load(path.join(this.server.projectPath, `assets/${id}`));

    return asset;
  }
}
