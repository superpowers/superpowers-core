import * as async from "async";
import * as fs from "fs";
import * as path from "path";

import ProjectHub from "./ProjectHub";
import BaseRemoteClient from "./BaseRemoteClient";

interface ProjectDetails {
  name: string;
  description: string;
  systemId: string;
  template: string;
  icon: Buffer;
}
interface AddProjectCallback { (err: string, projectId?: string): any; };

export default class RemoteHubClient extends BaseRemoteClient {
  constructor(public server: ProjectHub, socket: SocketIO.Socket) {
    super(server, socket);

    // Projects
    this.socket.on("add:projects", this.onAddProject);
    this.socket.on("edit:projects", this.onEditProject);
    this.socket.on("delete:projects", this.onDeleteProject);
  }

  // TODO: Implement roles and capabilities
  can(action: string) { return true; }

  private onAddProject = (details: ProjectDetails, callback: AddProjectCallback) => {
    if (!this.errorIfCant("editProjects", callback)) return;

    let formatVersion = SupCore.Data.ProjectManifest.currentFormatVersion;
    let templatePath: string;
    if (details.template != null) {
      templatePath = `${SupCore.systemsPath}/${details.systemId}/public/templates/${details.template}`;
      formatVersion = JSON.parse(fs.readFileSync(path.join(templatePath, `manifest.json`), { encoding: "utf8" })).formatVersion;
    }

    const manifest: SupCore.Data.ProjectManifestPub = {
      id: null,
      name: details.name,
      description: details.description,
      systemId: details.systemId,
      formatVersion
    };

    let projectFolder = manifest.name.toLowerCase().slice(0, 32).replace(/[^a-z0-9]/g, "-");
    const originalProjectFolder = projectFolder;
    let projectFolderNumber = 1;

    while(true) {
      try { fs.mkdirSync(path.join(this.server.projectsPath, projectFolder)); }
      catch (e) {
        projectFolder = `${originalProjectFolder}-${projectFolderNumber++}`;
        continue;
      }
      break;
    }
    const projectPath = path.join(this.server.projectsPath, projectFolder);

    const onFoldersCreated = (err: Error) => {
      if (err != null) { callback(`The project could not be created, folders creation has failed: ${err.message}`); return; }

      let sortedIndex = 0;
      for (const item of this.server.data.projects.pub) {
        if (SupCore.Data.Projects.sort(manifest, item) < 0) break;
        sortedIndex++;
      }

      this.server.data.projects.add(manifest, sortedIndex, (err: string, actualIndex: number) => {
        if (err != null) { callback(err); return; }

        const writeTemplate = (callback: (err?: NodeJS.ErrnoException) => any) => {
          const copyRecursively = (currentPath: string, callback: ((err?: NodeJS.ErrnoException) => any)) => {
            fs.readdir(path.join(templatePath, currentPath), (err, files) => {
              if (err != null) { callback(err); return; }
              async.each(files, (file, callback) => {
                if (file === "locales") { callback(null); return; }

                fs.lstat(path.join(templatePath, currentPath, file), (err, stats) => {
                  if (err != null) { callback(err); return; }

                  const filePath = path.join(currentPath, file);
                  if (stats.isDirectory()) {
                    fs.mkdir(path.join(projectPath, filePath), (err) => {
                      if (err != null) { callback(err); return; }
                      copyRecursively(filePath, callback);
                    });
                  } else {
                    fs.readFile(path.join(templatePath, filePath), (err, data) => {
                      fs.writeFile(path.join(projectPath, filePath), data, callback);
                    });
                  }
                });
              }, callback);
            });
          };
          copyRecursively("", callback);
        };

        const writeEntries = (callback: (err?: NodeJS.ErrnoException) => any) => {
          const entriesJSON = JSON.stringify([], null, 2);
          fs.writeFile(path.join(projectPath, "entries.json"), entriesJSON, { encoding: "utf8" }, callback);
        };

        const writeManifest = (callback: (err?: NodeJS.ErrnoException) => any) => {
          const manifestJSON = JSON.stringify(manifest, null, 2);
          fs.writeFile(path.join(projectPath, "manifest.json"), manifestJSON, { encoding: "utf8" }, callback);
        };

        const loadProject = (callback: (err: Error) => any) => { this.server.loadProject(projectFolder, callback); };

        const tasks = [ writeManifest, this.writeIcon.bind(this, projectPath, details.icon), loadProject ];
        tasks.splice(0, 0, details.template != null ? writeTemplate : writeEntries);

        async.series(tasks, (err) => {
          if (err != null) { SupCore.log(`Error while creating project:\n${err}`); return; }

          this.server.io.in("sub:projects").emit("add:projects", manifest, actualIndex);
          callback(null, manifest.id);
        });
      });
    };

    if (details.template != null) onFoldersCreated(null);
    else {
      async.each(["public", "assets", "trashedAssets", "rooms", "resources"], (folder, cb) => {
        fs.mkdir(path.join(projectPath, folder), cb);
      }, onFoldersCreated);
    }
  };

  private writeIcon = (projectPath: string, icon: Buffer, callback: (err?: NodeJS.ErrnoException) => any) => {
    if (icon == null) { callback(); return; }
    fs.mkdir(path.join(projectPath, "public"), (err) => {
      if (err != null && err.code !== "EEXIST") { callback(err); return; }
      fs.writeFile(path.join(projectPath, "public/icon.png"), icon, callback);
    });
  };

  private onEditProject = (projectId: string, details: ProjectDetails, callback: (err: string) => any) => {
    if (!this.errorIfCant("editProjects", callback)) return;

    const projectServer = this.server.serversById[projectId];
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

  private onDeleteProject = (projectId: string, callback: (err: string) => void) => {
    if (!this.errorIfCant("editProjects", callback)) return;

    const projectServer = this.server.serversById[projectId];
    if (projectServer == null) { callback("Invalid project id"); return; }

    fs.rename(projectServer.projectPath, projectServer.projectPath + ".deleted", (err) => {
      if(err != null) callback("Error while deleting project");

      this.server.data.projects.remove(projectId, (err) => {
        if(err != null) callback(err);
        else callback(null);
      });
    });
  };
}
