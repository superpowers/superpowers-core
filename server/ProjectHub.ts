import * as fs from "fs";
import * as async from "async";

import * as paths from "./paths";
import authMiddleware from "./authenticate";
import ProjectServer from "./ProjectServer";
import RemoteHubClient from "./RemoteHubClient";

export default class ProjectHub {

  globalIO: SocketIO.Server;
  io: SocketIO.Namespace;

  data = {
    projects: <SupCore.Data.Projects>null
  };

  serversById: { [serverId: string]: ProjectServer } = {};

  constructor(globalIO: SocketIO.Server, callback: (err: Error) => any) {
    this.globalIO = globalIO;

    let serveProjects = (callback: ErrorCallback) => {
      async.each(fs.readdirSync(paths.projects), (folderName: string, cb: (err: Error) => any) => {
        if (folderName.indexOf(".") !== -1) { cb(null); return; }
        this.loadProject(folderName, cb);
      }, callback);
    };

    let setupProjectsList = (callback: Function) => {
      let data: SupCore.Data.ProjectManifestPub[] = [];
      for (let id in this.serversById) data.push(this.serversById[id].data.manifest.pub);

      data.sort(SupCore.Data.Projects.sort);
      this.data.projects = new SupCore.Data.Projects(data);
      callback();
    };

    let serve = (callback: Function) => {
      this.io = this.globalIO.of("/hub");
      this.io.use(authMiddleware);

      this.io.on("connection", this.onAddSocket);
      callback();
    };

    async.waterfall([ serveProjects, setupProjectsList, serve ], callback);
  }

  saveAll(callback: (err: Error) => any) {
    async.each(Object.keys(this.serversById), (id, cb) => {
      this.serversById[id].save(cb);
    }, callback);
  }

  loadProject(folderName: string, callback: (err: Error) => any) {
    let server = new ProjectServer(this.globalIO, folderName, (err) => {
      if (err != null) { callback(err); return; }

      this.serversById[server.data.manifest.pub.id] = server;
      callback(null);
    });
  }

  removeRemoteClient(socketId: string) {
    // this.clients.splice ...
  }

  private onAddSocket = (socket: SocketIO.Socket) => {
    /* tslint:disable:no-unused-variable */
    let client = new RemoteHubClient(this, socket);
    // this.clients.push(client);
    /* tslint:enable:no-unused-variable */
  };
}
