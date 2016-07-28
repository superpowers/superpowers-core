import Hash from "./Hash";

import * as path from "path";
import * as fs from "fs";

export default class Asset extends Hash {
  constructor(public id: string, pub: any, schema: SupCore.Data.Schema, public server: ProjectServer) {
    super(pub, schema);
    this.setMaxListeners(Infinity);
    if (this.server == null) this.setup();
  }

  init(options: any, callback: Function) { this.setup(); callback(); }

  setup() { /* Override */ }

  restore() { /* Override */ }

  onClientUnsubscribed(clientId: string) { /* Override */ }

  destroy(callback: Function) { callback(); }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      if (err != null) throw err;

      const pub = JSON.parse(json);
      this._onLoaded(assetPath, pub);
    });
  }

  _onLoaded(assetPath: string, pub: any) {
    this.migrate(assetPath, pub, (hasMigrated) => {
      if (hasMigrated) {
        this.pub = pub;
        this.save(assetPath, (err) => {
          this.setup();
          this.emit("load");
        });
      } else {
        this.pub = pub;
        this.setup();
        this.emit("load");
      }
    });
  }

  unload() { this.removeAllListeners(); }

  migrate(assetPath: string, pub: any, callback: (hasMigrated: boolean) => void) { callback(false); };

  client_load() { /* Override */ }
  client_unload() { /* Override */ }

  save(assetPath: string, callback: (err: Error) => any) {
    const json = JSON.stringify(this.pub, null, 2);
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, callback);
  }

  server_setProperty(client: SupCore.RemoteClient, path: string, value: number|string|boolean, callback: SupCore.Data.Base.SetPropertyCallback) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, null, path, actualValue);
    });
  }
}
