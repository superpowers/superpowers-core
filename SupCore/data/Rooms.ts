import * as SupData from "./index";
import * as path from "path";

let roomRegex = /^[A-Za-z0-9_]{1,20}$/;

export default class Rooms extends SupData.base.Dictionary {
  server: any;

  constructor(server: any) {
    super()
    this.server = server;
  }

  acquire(id: string, owner: any, callback: (err: Error, item?: any) => any) {
    if (! roomRegex.test(id)) { callback( new Error(`Invalid room id: ${id}`)); return; }

    super.acquire(id, owner, (err: Error, item: SupData.Room) => {
      if (err != null) { callback(err); return; }
      if (owner == null) { callback(null, item); return; }

      item.join(owner, (err: string, roomUser: any, index: number) => {
        if (err != null) { callback(new Error(err)); return; }
        this.server.io.in(`sub:rooms:${id}`).emit('edit:rooms', id, 'join', roomUser, index);
        callback(null, item);
      });
    });
  }

  release(id: string, owner: any, options?: any) {
    super.release(id, owner, options);
    if (owner == null) return;

    this.byId[id].leave(owner, (err: string, roomUserId: string) => {
      if (err != null) throw new Error(err);
      this.server.io.in(`sub:rooms:${id}`).emit('edit:rooms', id, 'leave', roomUserId);
    });
  }

  _load(id: string) {
    let room = new SupData.Room(null);

    room.load(path.join(this.server.projectPath, `rooms/${id}`));

    return room;
  }
}
