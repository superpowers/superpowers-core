import ListById from "./base/ListById";

export default class Members extends ListById {
  static schema = {
    cachedUsername: { type: "string" }
  }

  constructor(pub: any[]) {
    super(pub, Members.schema);
  }
}
