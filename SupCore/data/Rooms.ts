import SupData = require("./index");
import path = require("path");

var roomRegex = /^[A-Za-z0-9_]{1,20}$/;

class Rooms extends SupData.base.Dictionary {
  server: any;

  constructor(server) {
    super()
    this.server = server;
  }

  acquire(id: string, owner, callback: (err: Error, item?: any) => any) {
    if (! roomRegex.test(id)) { callback( new Error(`Invalid room id: ${id}`)); return; }

    super.acquire(id, owner, (err, item: SupData.Room) => {
      if (err != null) { callback(err); return; }
      if (owner == null) { callback(null, item); return; }

      item.join(owner, (err, roomUser, index) => {
        if (err != null) { callback(new Error(err)); return; }
        this.server.io.in(`sub:rooms:${id}`).emit('edit:rooms', id, 'join', roomUser, index);
        callback(null, item);
      });
    });
  }

  release(id: string, owner, options) {
    super.release(id, owner, options);
    if (owner == null) return;

    this.byId[id].leave(owner,(err, roomUserId) => {
      if (err != null) throw new Error(err);
      this.server.io.in(`sub:rooms:${id}`).emit('edit:rooms', id, 'leave', roomUserId);
    });
  }

  _load(id: string) {
    var room = new SupData.Room(null);

    room.load(path.join(this.server.projectPath, `rooms/${id}`));

    return room;
  }
}

export = Rooms;
