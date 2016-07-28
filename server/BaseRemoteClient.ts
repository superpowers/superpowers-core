import * as AsyncLock from "async-lock";

export default class BaseRemoteClient {
  subscriptions: string[] = [];
  lock = new AsyncLock();

  constructor(public server: BaseServer, public socket: SocketIO.Socket) {
    this.socket.on("error", (err: Error) => { SupCore.log((err as any).stack); });
    this.socket.on("disconnect", this.onDisconnect);

    this.socket.on("sub", this.onSubscribe);
    this.socket.on("unsub", this.onUnsubscribe);
  }

  errorIfCant(action: string, callback: (error: string) => any) {
    if (!this.can(action)) {
      if (callback != null) callback("Forbidden");
      return false;
    }

    return true;
  }

  can(action: string) { throw new Error("BaseRemoteClient.can() must be overridden"); }

  /*
  _error(message: string) {
    this.socket.emit("error", message);
    this.socket.disconnect();
  }
  */

  private onDisconnect = () => {
    for (const subscription of this.subscriptions) {
      const [ , endpoint, id ] = subscription.split(":");
      if (id == null) continue;

      (this.server.data[endpoint] as SupCore.Data.Base.Dictionary).release(id, this);
    }

    this.server.removeRemoteClient(this.socket.id);
  };

  private onSubscribe = (endpoint: string, id: string, callback: (err: string, pubData?: any, optionalArg?: any) => any) => {
    const roomName = ((id != null) ? `sub:${endpoint}:${id}` : `sub:${endpoint}`);

    this.lock.acquire(roomName, (unlockRoom) => {
      const data = this.server.data[endpoint];
      if (data == null) {
        callback("No such endpoint");
        unlockRoom();
        return;
      }

      if (this.subscriptions.indexOf(roomName) !== -1) { callback(`You're already subscribed to ${id}`); return; }

      if (id == null) {
        this.socket.join(roomName);
        this.subscriptions.push(roomName);
        const pub = (data as SupCore.Data.Base.Hash).pub;
        const optionalArg = endpoint === "entries" ? (data as SupCore.Data.Entries).nextId : null;
        callback(null, pub, optionalArg);
        unlockRoom();
        return;
      }

      (data as SupCore.Data.Base.Dictionary).acquire(id, this, (err: Error, item: any) => {
        if (err != null) {
          callback(`Could not acquire item: ${err}`, null);
          unlockRoom();
          return;
        }

        this.socket.join(roomName);
        this.subscriptions.push(roomName);

        callback(null, item.pub);
        unlockRoom();
        return;
      });
    });
  };

  private onUnsubscribe = (endpoint: string, id: string) => {
    const data = this.server.data[endpoint];
    if (data == null) return;

    const roomName = ((id != null) ? `sub:${endpoint}:${id}` : `sub:${endpoint}`);

    this.lock.acquire(roomName, (unlockRoom) => {
      const index = this.subscriptions.indexOf(roomName);
      if (index === -1) return;

      if (id != null) { (data as SupCore.Data.Base.Dictionary).release(id, this); }

      this.socket.leave(roomName);
      this.subscriptions.splice(index, 1);
      unlockRoom();
    });
  };
}
