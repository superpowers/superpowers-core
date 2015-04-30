import ProjectHub from "./ProjectHub";
import ProjectServer from "./ProjectServer";

export default class BaseRemoteClient {

  server: BaseServer;
  socket: SocketIO.Socket;

  subscriptions: string[] = [];

  constructor(server: BaseServer, socket: SocketIO.Socket) {
    this.server = server;
    this.socket = socket;
    this.socket.on("disconnect", this._onDisconnect);

    this.socket.on("sub", this._onSubscribe);
    this.socket.on("unsub", this._onUnsubscribe);
  }

  errorIfCant(action: string, callback: (error: string) => any) {
    if (!this.can(action)) {
      if(callback != null) callback("Forbidden");
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

  _onDisconnect = () => {
    for (let subscription of this.subscriptions) {
      let [ sub, endpoint, id ] = subscription.split(":");
      if (id == null) continue;

      (<SupCore.data.base.Dictionary>this.server.data[endpoint]).release(id, this);
    }

    this.server.removeRemoteClient(this.socket.id);
  }

  _onSubscribe = (endpoint: string, id: string, callback: (err: string, pubData: any) => any) => {
    let data = this.server.data[endpoint];
    if (data == null) { callback("No such endpoint", null); return; }

    let roomName = (id != null) ? `sub:${endpoint}:${id}` : `sub:${endpoint}`;

    if (this.subscriptions.indexOf(roomName) != -1) { callback(`You're already subscribed to ${id}`, null); return; }

    if (id == null) {
      this.socket.join(roomName);
      this.subscriptions.push(roomName);
      callback(null, (<SupCore.data.base.Hash>data).pub);
      return;
    }

    (<SupCore.data.base.Dictionary>data).acquire(id, this, (err: Error, item: any) => {
      if (err != null) { callback(`Could not acquire asset: ${err}`, null); return; }

      this.socket.join(roomName);
      this.subscriptions.push(roomName);

      callback(null, item.pub);
      return
    });
  }

  _onUnsubscribe = (endpoint: string, id: string) => {
    let data = this.server.data[endpoint];
    if (data == null) return;

    let roomName = (id != null) ? `sub:${endpoint}:${id}` : `sub:${endpoint}`;

    let index = this.subscriptions.indexOf(roomName);
     if (index == -1) return;

    if (id != null) { (<SupCore.data.base.Dictionary>data).release(id, this); }

    this.socket.leave(roomName);
    this.subscriptions.splice(index, 1);
  }
}
