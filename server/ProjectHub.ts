import * as fs from "fs";
import * as path from "path";
import * as async from "async";

import ProjectServer from "./ProjectServer";
import RemoteHubClient from "./RemoteHubClient";

export default class ProjectHub {

  globalIO: SocketIO.Server;
  io: SocketIO.Namespace;
  projectsPath: string;
  buildsPath: string;

  data = {
    projects: null as SupCore.Data.Projects
  };

  serversById: { [serverId: string]: ProjectServer } = {};
  loadingProjectFolderName: string;

  constructor(globalIO: SocketIO.Server, dataPath: string, callback: (err: Error) => any) {
    this.globalIO = globalIO;
    this.projectsPath = path.join(dataPath, "projects");
    this.buildsPath = path.join(dataPath, "builds");

    const serveProjects = (callback: async.ErrorCallback<NodeJS.ErrnoException>) => {
      async.eachSeries(fs.readdirSync(this.projectsPath), (folderName: string, cb: (err: Error) => any) => {
        if (folderName.indexOf(".") !== -1) { cb(null); return; }
        this.loadingProjectFolderName = folderName;
        this.loadProject(folderName, cb);
      }, (err) => {
        if (err != null) throw err;
        this.loadingProjectFolderName = null;
        callback();
      });
    };

    const setupProjectsList = (callback: Function) => {
      const data: SupCore.Data.ProjectManifestPub[] = [];
      for (const id in this.serversById) data.push(this.serversById[id].data.manifest.pub);

      data.sort(SupCore.Data.Projects.sort);
      this.data.projects = new SupCore.Data.Projects(data);
      callback();
    };

    const serve = (callback: Function) => {
      this.io = this.globalIO.of("/hub");

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
    const server = new ProjectServer(this.globalIO, `${this.projectsPath}/${folderName}`, this.buildsPath, (err) => {
      if (err != null) { callback(err); return; }

      if (this.serversById[server.data.manifest.pub.id] != null) {
        callback(new Error(`There's already a project with this ID: ${server.data.manifest.pub.id} ` +
        `(${server.projectPath} and ${this.serversById[server.data.manifest.pub.id].projectPath})`));
        return;
      }

      this.serversById[server.data.manifest.pub.id] = server;
      callback(null);
    });
  }

  removeRemoteClient(socketId: string) {
    // this.clients.splice ...
  }

  private onAddSocket = (socket: SocketIO.Socket) => {
    /* const client = */ new RemoteHubClient(this, socket);
    // this.clients.push(client);
  }
}
