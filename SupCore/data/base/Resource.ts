import Hash from "./Hash";

import * as path from "path";
import * as fs from "fs";

export default class Resource extends Hash {
  serverData: ProjectServerData;

  constructor(pub: any, schema: any, serverData: ProjectServerData) {
    super(pub, schema);
    this.serverData = serverData;
    if (serverData == null) this.setup();
  }

  init(callback: Function) { this.setup(); callback(); }

  setup() {}

  load(resourcePath: string) {
    fs.readFile(path.join(resourcePath, "resource.json"), { encoding: "utf8" }, (err, json) => {
      if (err != null) {
        if (err.code === "ENOENT") {
          this.init(() => { this._onLoaded(resourcePath, true); });
          return;
        }
        throw err;
      }

      this.pub = JSON.parse(json);
      this._onLoaded(resourcePath, false);
    });
  }

  _onLoaded(resourcePath: string, justCreated: boolean) {
    if (justCreated) {
      this.save(resourcePath, (err) => {
        this.setup();
        this.emit("load");
      });
      return;
    }

    this.migrate((hasMigrated) => {
      if (hasMigrated) {
        this.save(resourcePath, (err) => {
          this.setup();
          this.emit("load");
        });
      } else {
        this.setup();
        this.emit("load");
      }
    });
  }

  unload() { this.removeAllListeners(); }

  migrate(callback: (hasMigrated: boolean) => void) { callback(false); };

  save(resourcePath: string, callback: (err: Error) => any) {
    let json = JSON.stringify(this.pub, null, 2);

    fs.mkdir(path.join(resourcePath), (err) => {
      if (err != null && err.code !== "EEXIST") { callback(err); return; }
      fs.writeFile(path.join(resourcePath, "resource.json"), json, { encoding: "utf8" }, callback);
    });
  }

  server_setProperty(client: any, path: string, value: number|string|boolean, callback: (err: string, path?: string, value?: any) => any) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}
