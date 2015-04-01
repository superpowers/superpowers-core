import Hash = require("./Hash");

import path = require("path");
import fs = require("fs");

class Asset extends Hash {
  id: string;
  serverData: any;

  constructor(id, pub, schema, serverData) {
    super(pub, schema);
    this.id = id;
    this.serverData = serverData;
    if (this.pub != null) this.setup();
  }

  init(options, callback: Function) { this.setup(); callback(); }

  setup() {}

  restore() {}

  destroy(callback: Function) { callback(); }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: 'utf8' },(err, json) => {
      if (err != null) throw err;

      this.pub = JSON.parse(json)
      this.setup()
      this.emit('load');
    });
  }

  unload() { this.removeAllListeners(); }

  save(assetPath: string, callback: (err: Error) => any) {
    var json = JSON.stringify(this.pub, null, 2);
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: 'utf8' }, callback);
  }

  server_setProperty(client, path, value, callback: (err: string, path?: string, value?: any) => any) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}

export = Asset;
