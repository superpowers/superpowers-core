/// <reference path="../SupCore/SupCore.d.ts" />

interface BaseServer {
  data: any;
  io: SocketIO.Namespace;

  removeRemoteClient(socketId: string): void;
}

declare module "passport.socketio" {
  interface AuthorizeOptions {
    passport?: any;
    key?: string;
    secret?: string;
    store?: any;
    cookieParser?: any;
    success?: (data: any, accept: boolean) => void;
    fail?: (data: any, message: string, critical: boolean, accept: boolean) => void;
  }

  export function authorize(options: AuthorizeOptions): (socket: any, fn: (err?: any) => void) => void;
}

declare module "tsscmp" {
  function compare(a: string, b: string): boolean;
  namespace compare {}
  export = compare;
}
