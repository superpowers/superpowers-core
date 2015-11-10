import Hash from "./Hash";

import * as path from "path";
import * as fs from "fs";

interface ServerData { [name: string]: SupCore.data.base.Dictionary; };

export default class Asset extends Hash {
  id: string;
  serverData: ServerData;

  constructor(id: string, pub: any, schema: any, serverData: ServerData) {
    super(pub, schema);
    this.id = id;
    this.serverData = serverData;
    if (this.serverData == null) this.setup();
  }

  init(options: any, callback: Function) { this.setup(); callback(); }

  setup() {}

  restore() {}

  destroy(callback: Function) { callback(); }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" },(err, json) => {
      if (err != null) throw err;

      let pub = JSON.parse(json)
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

  client_load() {}
  client_unload() {}

  save(assetPath: string, callback: (err: Error) => any) {
    let json = JSON.stringify(this.pub, null, 2);
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, callback);
  }

  server_setProperty(client: any, path: string, value: any, callback: (err: string, path?: string, value?: any) => any) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}
