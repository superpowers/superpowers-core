import config from "./config";

/* tslint:disable */
let bcrypt = require("bcryptjs");
/* tslin:enable */

// NOTE: The regex must match the pattern and min/max lengths in client/src/login/index.jade
const usernameRegex = /^[A-Za-z0-9_-]{3,20}$/;

export default function(socket: SocketIO.Socket, next: Function) {
  let auth: any;
  if (socket.handshake.query != null) {
    const authJSON = socket.handshake.query.supServerAuth;
    try { auth = JSON.parse(authJSON); } catch (e) { /* Ignore */ }
  }

  authentify(auth, socket, next);
  return;
}

function authentify(auth: any, socket: SocketIO.Socket, next: Function) {
  if (auth == null) {
    next(new Error("invalidCredentials"));
    return;
  }

  if (typeof auth.username !== "string" || !usernameRegex.test(auth.username)) {
    next(new Error("invalidUsername"));
    return;
  }

  verifyServerPassword(auth.serverPassword, config.password, socket, next);
  return;
}

function verifyServerPassword(password: string, hash: string, socket: SocketIO.Socket, next : Function) {
  if (config.password.length === 0) {
    next();
    return;
  }

  bcrypt.compare(password, hash, function(err : Error, res : boolean) {
    if (res) {
      next();
      return;
    }

    next(new Error("invalidCredentials"));
  });
  return;
}
