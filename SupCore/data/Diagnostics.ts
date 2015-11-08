import ListById from "./Base/ListById";

export default class Diagnostics extends ListById {
  static schema = {
    id: { type: "string" },
    type: { type: "string" },
    data: { type: "any" }
  }

  constructor(pub: any[]) {
    super(pub, Diagnostics.schema);
  }
}
