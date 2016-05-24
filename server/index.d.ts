/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../SupCore/SupCore.d.ts" />

interface BaseServer {
  data: any;
  io: SocketIO.Namespace;

  removeRemoteClient(socketId: string): void;
}
