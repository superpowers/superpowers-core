import config from "./config";

let usernameRegex = /^[A-Za-z0-9_]{3,20}$/;

export default function(socket: SocketIO.Socket, next: Function) {
  let auth: any;
  if (socket.handshake.query != null) {
    let authJSON = socket.handshake.query.supServerAuth;
    try { auth = JSON.parse(authJSON); } catch (e) { /* Ignore */ }
  }

  if (authentify(auth)) {
      (<any>socket).username = auth.username;
  }

  if ((<any>socket).username == null) {
    if (config.password.length > 0) { next(new Error("invalidCredentials")); return; }
    else { next(new Error("invalidUsername")); return; }
  }
  next();
}

function authentify(auth: any) {
  if (auth == null) {
    return false;
  }

  if (typeof auth.username !== "string" || !usernameRegex.test(auth.username)) {
    return false;
  }

  if (verifyServerPassword(auth.serverPassword, config.password)) {
    return true;
  }

  return false;
}

function verifyServerPassword(password: string, hash: string) {
  if (config.password.length === 0) {
    return true;
  }

  if (config.password === password) {
    return true;
  }

  return false;
}
