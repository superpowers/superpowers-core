import * as fs from "fs";
import * as path from "path";
import * as async from "async";
import authMiddleware from "./authenticate";

import ProjectServer from "./ProjectServer";
import RemoteHubClient from "./RemoteHubClient";

export default class ProjectHub {

  globalIO: SocketIO.Server;
  io: SocketIO.Namespace;
  projectsPath: string;

  data = {
    projects: <SupCore.data.Projects>null
  };

  serversById: { [serverId: string]: ProjectServer } = {};

  constructor(globalIO: SocketIO.Server, projectsPath: string, callback: (err: Error) => any) {
    this.globalIO = globalIO;
    this.projectsPath = projectsPath;

    let serveProjects = (callback: ErrorCallback) => {
      async.each(fs.readdirSync(this.projectsPath), (projectFolder: string, cb: (err: Error) => any) => {
        if (projectFolder.indexOf(".") !== -1) { cb(null); return; }
        this.loadProject(projectFolder, null, cb);
      }, callback);
    };

    let setupProjectsList = (callback: Function) => {
      let data: SupCore.data.ProjectItem[] = [];
      for (let id in this.serversById) data.push(this.serversById[id].data.manifest.pub);

      this.data.projects = new SupCore.data.Projects(data);
      callback();
    };

    let serve = (callback: Function) => {
      this.io = this.globalIO.of("/hub");
      this.io.use(authMiddleware);

      this.io.on("connection", this._onAddSocket);
      callback();
    };

    async.waterfall([ serveProjects, setupProjectsList, serve ], callback);
  }

  saveAll(callback: (err: Error) => any) {
    async.each(Object.keys(this.serversById), (id, cb) => {
      this.serversById[id].save(cb);
    }, callback);
  }

  _onAddSocket = (socket: SocketIO.Socket) => {
    let client = new RemoteHubClient(this, socket);
    // this.clients.push(client);
  }

  loadProject(projectFolder: string, manifestData: { id: string; name: string; description: string; }, callback: (err: Error) => any) {
    let server = new ProjectServer(this.globalIO, path.join(this.projectsPath, projectFolder), manifestData, (err) => {
      if (err != null) { callback(err); return; }

      this.serversById[server.data.manifest.pub.id] = server;
      callback(null);
    });
  }

  removeRemoteClient(socketId: string) {
    // this.clients.splice ...
  }
}
