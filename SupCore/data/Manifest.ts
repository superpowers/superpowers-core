import Hash = require("./base/Hash");

class Manifest extends Hash {
  static schema = {
    id: { type: 'string' },
    name: { type: 'string', minLength: 1, maxLength: 80, mutable: true },
    description: { type: 'string', maxLength: 300, mutable: true }
  }
  
  constructor(pub) {
    super(pub, Manifest.schema);
  }
}

export = Manifest;
