import ListById from "./Base/ListById";

export default class Badges extends ListById {
  static schema: SupCore.Data.Schema = {
    id: { type: "string" },
    type: { type: "string" },
    data: { type: "any" }
  };

  constructor(pub: SupCore.Data.BadgeItem[]) {
    super(pub, Badges.schema);
  }
}
