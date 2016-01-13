import Hash from "./Hash";

import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";

export default class Asset extends Hash {
  constructor(public id: string, pub: any, schema: any, public server: ProjectServer) {
    super(pub, schema);
    this.setMaxListeners(Infinity);
    if (this.server == null) this.setup();
  }

  init(options: any, callback: Function) { this.setup(); callback(); }

  setup() { /* Override */ }

  restore() { /* Override */ }

  destroy(callback: Function) { callback(); }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      if (err != null) throw err;

      let pub = JSON.parse(json);
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
    let json = JSON.stringify(this.pub, null, 2);
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, callback);
  }

  publish(buildPath: string, callback: (err: Error) => any) {
    let folderPath = `${buildPath}/assets/${this.server.data.entries.getStoragePathFromId(this.id)}`;
    mkdirp(folderPath, (err) => { this.save(folderPath, callback); });
  }

  server_setProperty(client: any, path: string, value: any, callback: (err: string, path?: string, value?: any) => any) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}
