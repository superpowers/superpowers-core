import ListById from "./Base/ListById";

export default class RoomUsers extends ListById {
  static schema = {
    // TODO: use userId for id when we've got proper login
    id: { type: "string", minLength: 3, maxLength: 20 },
    connectionCount: { type: "number", min: 1 }
    // username: { type: "string", minLength: 3, maxLength: 20 }
  };

  constructor(pub: any) {
    super(pub, RoomUsers.schema);
  }
}
