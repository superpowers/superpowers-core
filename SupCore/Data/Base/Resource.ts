import Hash from "./Hash";

import * as path from "path";
import * as fs from "fs";

export default class Resource extends Hash {
  constructor(public id: string, pub: any, schema: SupCore.Data.Schema, public server: ProjectServer) {
    super(pub, schema);
    if (server == null) this.setup();
  }

  init(callback: Function) { this.setup(); callback(); }

  setup() { /* Override */ }

  restore() { /* Override */ }

  load(resourcePath: string) {
    fs.readFile(path.join(resourcePath, "resource.json"), { encoding: "utf8" }, (err, json) => {
      if (err != null) {
        if (err.code === "ENOENT") {
          this.init(() => { this._onLoaded(resourcePath, this.pub, true); });
          return;
        }
        throw err;
      }

      let pub = JSON.parse(json);
      this._onLoaded(resourcePath, pub, false);
    });
  }

  _onLoaded(resourcePath: string, pub: any, justCreated: boolean) {
    if (justCreated) {
      this.pub = pub;
      fs.mkdir(path.join(resourcePath), (err) => {
        this.save(resourcePath, (err) => {
          this.setup();
          this.emit("load");
        });
      });
      return;
    }

    this.migrate(resourcePath, pub, (hasMigrated) => {
      if (hasMigrated) {
        this.pub = pub;
        fs.mkdir(path.join(resourcePath), (err) => {
          this.save(resourcePath, (err) => {
            this.setup();
            this.emit("load");
          });
        });
      } else {
        this.pub = pub;
        this.setup();
        this.emit("load");
      }
    });
  }

  unload() { this.removeAllListeners(); }

  migrate(resourcePath: string, pub: any, callback: (hasMigrated: boolean) => void) { callback(false); };

  save(resourcePath: string, callback: (err: Error) => any) {
    let json = JSON.stringify(this.pub, null, 2);
    fs.writeFile(path.join(resourcePath, "resource.json"), json, { encoding: "utf8" }, callback);
  }

  publish(buildPath: string, callback: (err: Error) => any) {
    let folderPath = `${buildPath}/resources/${this.id}`;
    fs.mkdir(folderPath, (err) => { this.save(folderPath, callback); });
  }

  server_setProperty(client: any, path: string, value: number|string|boolean, callback: (err: string, path?: string, value?: any) => any) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}
