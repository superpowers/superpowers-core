import Hash = require("./base/Hash");

class Internals extends Hash {
  static schema = {
    nextBuildId: { type: 'integer', min: 0, mutable: true },
    nextEntryId: { type: 'integer', min: 0, mutable: true }
  }

  constructor(pub: any) {
    super(pub, Internals.schema);
  }
}

export = Internals;
