import * as async from "async";
import * as fs from "fs";
import * as path from "path";

import * as paths from "./paths";
import ProjectHub from "./ProjectHub";
import BaseRemoteClient from "./BaseRemoteClient";

interface ProjectDetails {
  name: string;
  description: string;
  system: string;
  icon: Buffer;
}
interface AddProjectCallback { (err: string, projectId?: string): any; };

export default class RemoteHubClient extends BaseRemoteClient {
  constructor(public server: ProjectHub, socket: SocketIO.Socket) {
    super(server, socket);

    // Projects
    this.socket.on("add:projects", this.onAddProject);
    this.socket.on("edit:projects", this.onEditProject);
  }

  // TODO: Implement roles and capabilities
  can(action: string) { return true; }

  private onAddProject = (details: ProjectDetails, callback: AddProjectCallback) => {
    if (!this.errorIfCant("editProjects", callback)) return;

    let manifest: SupCore.Data.ProjectManifestPub = {
      id: null,
      name: details.name,
      description: details.description,
      system: details.system,
      formatVersion: SupCore.Data.ProjectManifest.currentFormatVersion
    };

    let projectFolder = manifest.name.toLowerCase().slice(0, 32).replace(/[^a-z0-9]/g, "-");
    let originalProjectFolder = projectFolder;
    let projectFolderNumber = 1;

    while(true) {
      try {
        fs.mkdirSync(path.join(paths.projects, projectFolder));
      } catch (e) {
        projectFolder = `${originalProjectFolder}-${projectFolderNumber++}`;
        continue;
      }
      break;
    }

    let projectPath = path.join(paths.projects, projectFolder);
    fs.mkdirSync(path.join(projectPath, "public"));
    fs.mkdirSync(path.join(projectPath, "assets"));
    fs.mkdirSync(path.join(projectPath, "trashedAssets"));
    fs.mkdirSync(path.join(projectPath, "rooms"));
    fs.mkdirSync(path.join(projectPath, "resources"));

    let sortedIndex = 0;
    for (let item of this.server.data.projects.pub) {
      if (SupCore.Data.Projects.sort(manifest, item) < 0) break;
      sortedIndex++;
    }

    this.server.data.projects.add(manifest, sortedIndex, (err: string, actualIndex: number) => {
      if (err != null) { callback(err); return; }

      let writeManifest = (callback: (err?: NodeJS.ErrnoException) => any) => {
        let manifestJSON = JSON.stringify(manifest, null, 2);
        fs.writeFile(path.join(projectPath, "manifest.json"), manifestJSON, { encoding: "utf8" }, callback);
      };

      let writeEntries = (callback: (err?: NodeJS.ErrnoException) => any) => {
        let entriesJSON = JSON.stringify([], null, 2);
        fs.writeFile(path.join(projectPath, "entries.json"), entriesJSON, { encoding: "utf8" }, callback);
      };

      let loadProject = (callback: (err: Error) => any) => { this.server.loadProject(projectFolder, callback); };

      async.series([ writeManifest, writeEntries, this.writeIcon.bind(this, projectPath, details.icon), loadProject ], (err) => {
        if (err != null) { SupCore.log(`Error while creating project:\n${err}`); return; }

        this.server.io.in("sub:projects").emit("add:projects", manifest, actualIndex);
        callback(null, manifest.id);
      });
    });
  };

  private writeIcon = (projectPath: string, icon: Buffer, callback: (err?: NodeJS.ErrnoException) => any) => {
    if (icon == null) { callback(); return; }
    fs.writeFile(path.join(projectPath, "public/icon.png"), icon, callback);
  };

  private onEditProject = (projectId: string, details: ProjectDetails, callback: (err: string) => any) => {
    if (!this.errorIfCant("editProjects", callback)) return;

    let projectServer = this.server.serversById[projectId];
    if (projectServer == null) { callback("Invalid project id"); return; }

    async.series([

      (cb) => {
        if (details.name == null) { cb(); return; }

        projectServer.data.manifest.setProperty("name", details.name, (err, value) => {
          if (err != null) { cb(new Error(err)); return; }

          projectServer.io.in("sub:manifest").emit("setProperty:manifest", "name", details.name);
          this.server.io.in("sub:projects").emit("setProperty:projects", projectId, "name", details.name);
          cb();
        });
      },

      (cb) => {
        if (details.description == null) { cb(); return; }

        projectServer.data.manifest.setProperty("description", details.description, (err, value) => {
          if (err != null) { cb(new Error(err)); return; }

          projectServer.io.in("sub:manifest").emit("setProperty:manifest", "description", details.description);
          this.server.io.in("sub:projects").emit("setProperty:projects", projectId, "description", details.description);
          cb();
        });
      },

      (cb) => {
        if (details.icon == null) { cb(); return; }

        this.writeIcon(projectServer.projectPath, details.icon, (err) => {
          if (err != null) { cb(new Error("Failed to save icon")); return; }

          projectServer.io.in("sub:manifest").emit("updateIcon:manifest");
          this.server.io.in("sub:projects").emit("updateIcon:projects", projectId);
          cb();
        });
      }

    ], (err) => {
      if (err != null) callback(err.message);
      else callback(null);
    });
  };
}
