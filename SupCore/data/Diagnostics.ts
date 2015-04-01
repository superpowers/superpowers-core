import ListById = require("./base/ListById");

class Diagnostics extends ListById {
  static schema = {
    id: { type: "string" },
    type: { type: "string" },
    data: { type: "any" }
  }

  constructor(pub) {
    super(pub, Diagnostics.schema);
  }
}
export = Diagnostics
