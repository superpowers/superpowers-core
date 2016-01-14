export default class BaseRemoteClient {
  subscriptions: string[] = [];

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
    for (let subscription of this.subscriptions) {
      let [ , endpoint, id ] = subscription.split(":");
      if (id == null) continue;

      (this.server.data[endpoint] as SupCore.Data.Base.Dictionary).release(id, this);
    }

    this.server.removeRemoteClient(this.socket.id);
  };

  private onSubscribe = (endpoint: string, id: string, callback: (err: string, pubData: any) => any) => {
    let data = this.server.data[endpoint];
    if (data == null) { callback("No such endpoint", null); return; }

    let roomName = (id != null) ? `sub:${endpoint}:${id}` : `sub:${endpoint}`;

    if (this.subscriptions.indexOf(roomName) !== -1) { callback(`You're already subscribed to ${id}`, null); return; }

    if (id == null) {
      this.socket.join(roomName);
      this.subscriptions.push(roomName);
      callback(null, (data as SupCore.Data.Base.Hash).pub);
      return;
    }

    (data as SupCore.Data.Base.Dictionary).acquire(id, this, (err: Error, item: any) => {
      if (err != null) { callback(`Could not acquire asset: ${err}`, null); return; }

      this.socket.join(roomName);
      this.subscriptions.push(roomName);

      callback(null, item.pub);
      return;
    });
  };

  private onUnsubscribe = (endpoint: string, id: string) => {
    let data = this.server.data[endpoint];
    if (data == null) return;

    let roomName = (id != null) ? `sub:${endpoint}:${id}` : `sub:${endpoint}`;

    let index = this.subscriptions.indexOf(roomName);
     if (index === -1) return;

    if (id != null) { (data as SupCore.Data.Base.Dictionary).release(id, this); }

    this.socket.leave(roomName);
    this.subscriptions.splice(index, 1);
  };
}
