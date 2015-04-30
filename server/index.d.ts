/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../SupCore/SupCore.d.ts" />

interface BaseServer {
  data: any;
  removeRemoteClient(socketId: string): void;

  io: SocketIO.Namespace;
}
