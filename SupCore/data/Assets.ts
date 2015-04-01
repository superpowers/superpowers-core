import SupData = require("./index");
import path = require("path");

class Assets extends SupData.base.Dictionary {
  server: any;

  constructor(server) {
    super();
    this.server = server;
  }

  acquire(id: string, owner, callback: (err: Error) => any) {
    if (this.server.data.entries.byId[id] == null || this.server.data.entries.byId[id].type == null) { callback(new Error(`Invalid asset id: ${id}`)); return }

    super.acquire(id, owner, callback);
  }

  _load(id: string) {
    var entry = this.server.data.entries.byId[id];

    var assetClass = SupData.assetClasses[entry.type];
    if (assetClass == null) throw new Error(`No data plugin for asset type "${entry.type}"`);

    var asset = new assetClass(id, null, this.server.data);
    asset.load(path.join(this.server.projectPath, `assets/${id}`));

    return asset;
  }
}

export = Assets;
