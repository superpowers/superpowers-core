import ListById = require("./base/ListById");

class Members extends ListById {
  static schema = {
    cachedUsername: { type: 'string' }
  }

  constructor(pub: any[]) {
    super(pub, Members.schema);
  }
}

export = Members;
