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

  // OVERRIDE: Make sure to call super(callback). Called when creating a new asset
  init(options, callback: Function) { this.setup(); callback(); }

  // OVERRIDE: Called when creating/loading an asset
  setup() {}

  // OVERRIDE: Called when loading a project
  // Check for any error/warning/info and this.emit 'setDiagnostic' as required
  // Also if the asset depends on others, this.emit 'addDependencies' with a list of entry IDs
  restore() {}

  // OVERRIDE: Called when destroying an asset
  // Most assets won't need to do anything here but some might want to do some
  // clean up work like making changes to associated resources
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

