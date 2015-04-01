import Hash = require("./Hash");

import path = require("path");
import fs = require("fs");

class Resource extends Hash {
  serverData: any;

  constructor(pub, schema, serverData) {
    super(pub, schema);
    this.serverData = serverData;
    if (pub!= null) this.setup();
  }

  // OVERRIDE: Make sure to call super(callback). Called when creating a new resource
  init(callback: Function) { this.setup(); callback(); }

  // OVERRIDE: Called when creating/loading a resource
  setup() {}

  load(resourcePath: string) {
    fs.readFile(path.join(resourcePath, "resource.json"), { encoding: 'utf8' }, (err, json) => {
      if (err != null) {
        if (err.code == 'ENOENT') {
          this.init( () => { this.emit('load') } );
          return;
        }

        throw err;
      }

      this.pub = JSON.parse(json);
      this.setup();
      this.emit('load');
    });
  }

  unload() { this.removeAllListeners(); }

  save(resourcePath: string, callback: (err: Error) => any) {
    var json = JSON.stringify(this.pub, null, 2);

    fs.mkdir(path.join(resourcePath), (err) => {
      if (err != null && err.code != "EEXIST") { callback(err); return; }
      fs.writeFile(path.join(resourcePath, "resource.json"), json, { encoding: 'utf8' }, callback);
    });
  }

  server_setProperty(client, path, value, callback: (err: string, path?: string, value?: any) => any) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}

export = Resource;
