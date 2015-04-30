import * as async from "async";
import * as fs from "fs";
import * as path from "path";

import ProjectHub from "./ProjectHub";
import BaseRemoteClient from "./BaseRemoteClient";

export default class RemoteHubClient extends BaseRemoteClient {

  server: ProjectHub;

  constructor(server: ProjectHub, socket: SocketIO.Socket) {
    super(server, socket);

    // Projects
    this.socket.on("add:projects", this._onAddProject);
    this.socket.on("setProperty:projects", this._onSetProjectProperty);
  }

  // TODO: Implement roles and capabilities
  can(action: string) { return true; }

  _onAddProject = (name: string, description: string, callback: (err: string, projectId?: string) => any) => {
    if (! this.errorIfCant("editProjects", callback)) return;

    let manifest: SupCore.data.ProjectItem = { id: null, name, description };

    // TODO: use lodash 3.0 with string methods when it's released
    let projectFolder = manifest.name.toLowerCase().slice(0, 16).replace(/[^a-z0-9]/g, "-");
    let originalProjectFolder = projectFolder;
    let projectFolderNumber = 1;

    while(true) {
      try {
        fs.mkdirSync(path.join(this.server.projectsPath, projectFolder));
      } catch(e) {
        projectFolder = `${originalProjectFolder}-${projectFolderNumber++}`;
        continue;
      }
      break;
    }

    let projectPath = path.join(this.server.projectsPath, projectFolder);
    fs.mkdirSync(path.join(projectPath, "assets"));
    fs.mkdirSync(path.join(projectPath, "rooms"));

    this.server.data.projects.add(manifest, null, (err: string, actualIndex: number) => {
      if (err != null) { callback(err); return; }

      let writeManifest = (callback: (err: NodeJS.ErrnoException) => any) => {
        let manifestJSON = JSON.stringify(manifest, null, 2);
        fs.writeFile(path.join(projectPath, "manifest.json"), manifestJSON, { encoding: "utf8" }, callback);
      };

      let writeInternals = (callback: (err: NodeJS.ErrnoException) => any) => {
        let internalsJSON = JSON.stringify({ nextBuildId: 0, nextEntryId: 0 }, null, 2);
        fs.writeFile(path.join(projectPath, "internals.json"), internalsJSON, { encoding: "utf8" }, callback);
      };

      let writeMembers = (callback: (err: NodeJS.ErrnoException) => any) => {
        // TODO: Add the project creator
        let membersJSON = JSON.stringify([], null, 2);
        fs.writeFile(path.join(projectPath, "members.json"), membersJSON, { encoding: "utf8" }, callback);
      };

      let writeEntries = (callback: (err: NodeJS.ErrnoException) => any) => {
        let entriesJSON = JSON.stringify([], null, 2);
        fs.writeFile(path.join(projectPath, "entries.json"), entriesJSON, { encoding: "utf8" }, callback);
      };

      let loadProject = (callback: (err: Error) => any) => { this.server.loadProject(projectFolder, manifest, callback); };

      async.series([ writeManifest, writeInternals, writeMembers, writeEntries, loadProject ], (err) => {
        if (err != null) { SupCore.log(`Error while creating project:\n${err}`); return; }

        this.server.io.in("sub:projects").emit("add:projects", manifest, actualIndex);
        callback(null, manifest.id);
      });
    });
  }

  _onSetProjectProperty = (id: string, key: string, value: any, callback: (err: string) => any) => {
    let projectServer = this.server.serversById[id];
    if (projectServer == null) { callback("Invalid project id"); return; }

    projectServer.data.manifest.setProperty(key, value, (err, value) => {
      if (err != null) { callback(err); return; }

      projectServer.io.in("sub:manifest").emit("setProperty:manifest", key, value);
      this.server.io.in("sub:projects").emit("setProperty:projects", id, key, value);
      callback(null);
    });
  }
}
