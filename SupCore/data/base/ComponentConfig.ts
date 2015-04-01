import Hash = require("./Hash");

class ComponentConfig extends Hash {
  constructor(pub, schema) {
    super(pub, schema);
  }

  restore() {}

  destroy() {}

  server_setProperty(client, path, value, callback) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}

export = ComponentConfig;
