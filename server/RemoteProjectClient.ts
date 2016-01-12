import BaseRemoteClient from "./BaseRemoteClient";
import ProjectServer from "./ProjectServer";
import config from "./config";
import { buildFilesBySystem } from "./loadSystems";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as rimraf from "rimraf";
import * as async from "async";
import * as recursiveReaddir from "recursive-readdir";

export default class RemoteProjectClient extends BaseRemoteClient {

  server: ProjectServer;
  id: string;

  constructor(server: ProjectServer, id: string, socket: SocketIO.Socket) {
    super(server, socket);
    this.id = id;
    this.socket.emit("welcome", this.id, { buildPort: config.buildPort, systemId: this.server.system.id });

    // Manifest
    this.socket.on("setProperty:manifest", this.onSetManifestProperty);

    // Entries
    this.socket.on("add:entries", this.onAddEntry);
    this.socket.on("duplicate:entries", this.onDuplicateEntry);
    this.socket.on("move:entries", this.onMoveEntry);
    this.socket.on("trash:entries", this.onTrashEntry);
    this.socket.on("setProperty:entries", this.onSetEntryProperty);

    // Assets
    this.socket.on("edit:assets", this.onEditAsset);

    // Resources
    this.socket.on("edit:resources", this.onEditResource);

    // Rooms
    this.socket.on("edit:rooms", this.onEditRoom);

    // Project
    this.socket.on("vacuum:project", this.onVacuumProject);
    this.socket.on("build:project", this.onBuildProject);
  }

  // TODO: Implement roles and capabilities
  can(action: string) { return true; }

  // Manifest

  private onSetManifestProperty = (key: string, value: any, callback: (err: string, value: any) => any) => {
    this.server.data.manifest.setProperty(key, value, (err: string, actualValue: any) => {
      if (err != null) { callback(err, null); return; }

      this.server.io.in("sub:manifest").emit("setProperty:manifest", key, actualValue);
      callback(null, actualValue);
    });
  };

  // Entries

  private onAddEntry = (name: string, type: string, options: any, callback: (err: string, newId?: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;

    name = name.trim();
    if (name.length === 0) { callback("Entry name cannot be empty"); return; }
    if (name.indexOf("/") !== -1) { callback("Entry name cannot contain slashes"); return; }

    let entry: SupCore.Data.EntryNode = { id: null, name, type, badges: [], dependentAssetIds: [] };
    if (options == null) options = {};

    this.server.data.entries.add(entry, options.parentId, options.index, (err: string, actualIndex: number) => {
      if (err != null) { callback(err, null); return; }

      let onEntryCreated = () => {
        this.server.io.in("sub:entries").emit("add:entries", entry, options.parentId, actualIndex);
        callback(null, entry.id);
      };

      if (entry.type != null) {
        let assetClass = this.server.system.data.assetClasses[entry.type];
        let asset = new assetClass(entry.id, null, this.server);
        asset.init({ name: entry.name }, () => {
          let assetPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(entry.id)}`);
          mkdirp(assetPath, () => { asset.save(assetPath, onEntryCreated); });
        });
      } else {
        onEntryCreated();
      }
    });
  };

  private onDuplicateEntry = (newName: string, id: string, options: any, callback: (err: string, duplicatedId?: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;

    let entryToDuplicate = this.server.data.entries.byId[id];
    if (entryToDuplicate == null) { callback(`Entry ${id} doesn't exist`); return; }
    if (entryToDuplicate.type == null) { callback("Entry to duplicate must be an asset"); return; }

    let entry: SupCore.Data.EntryNode = {
      id: null, name: newName, type: entryToDuplicate.type,
      badges: [], dependentAssetIds: []
    };

    if (options == null) options = {};

    this.server.data.entries.add(entry, options.parentId, options.index, (err: string, actualIndex: number) => {
      if (err != null) { callback(err); return; }

      let newAssetPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(entry.id)}`);
      this.server.data.assets.acquire(id, null, (err, referenceAsset) => {
        mkdirp(newAssetPath, () => {
          referenceAsset.save(newAssetPath, (err: Error) => {
            this.server.data.assets.release(id, null);

            if (err != null) {
              this.server.log(`Failed to save duplicated asset at ${newAssetPath} (duplicating ${id})`);
              this.server.log(err.toString());
              this.server.data.entries.remove(entry.id, (err) => { if (err != null) this.server.log(err); });
              callback("Could not save asset");
              return;
            }

            this.server.data.assets.acquire(entry.id, null, (err, newAsset) => {
              newAsset.restore();
              this.server.data.assets.release(entry.id, null);

              this.server.io.in("sub:entries").emit("add:entries", entry, options.parentId, actualIndex);
              callback(null, entry.id);
            });
          });
        });
      });
    });
  };

  private onMoveEntry = (id: string, parentId: string, index: number, callback: (err: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;

    let oldFullAssetPath = this.server.data.entries.getStoragePathFromId(id);
    let oldParent = this.server.data.entries.parentNodesById[id];

    this.server.data.entries.move(id, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      this.onEntryChangeFullPath(id, oldFullAssetPath, () => {
        if (oldParent == null || oldParent.children.length > 0) return;

        let oldParentPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(oldParent.id)}`);
        fs.readdir(oldParentPath, (err, files) => { if (files.length === 0) fs.rmdir(oldParentPath); });
      });
      this.server.io.in("sub:entries").emit("move:entries", id, parentId, actualIndex);
      callback(null);
    });
  };

  private onTrashEntry = (id: string, callback: (err: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;

    let trashEntryRecursively = (entry: SupCore.Data.EntryNode, callback: (err: Error) => void) => {
      let finishTrashEntry = (err: Error) => {
        if (err != null) { callback(err); return; }

        // Clear all dependencies for this entry
        let dependentAssetIds = (entry != null) ? entry.dependentAssetIds : null;

        let dependencies = this.server.data.entries.dependenciesByAssetId[entry.id];
        if (dependencies != null) {
          let removedDependencyEntryIds = <string[]>[];
          for (let depId of dependencies) {
            let depEntry = this.server.data.entries.byId[depId];
            if (depEntry == null) continue;

            let dependentAssetIds = depEntry.dependentAssetIds;
            let index = dependentAssetIds.indexOf(entry.id);
            if (index !== -1) {
              dependentAssetIds.splice(index, 1);
              removedDependencyEntryIds.push(depId);
            }
          }

          if (removedDependencyEntryIds.length > 0) {
            this.server.io.in("sub:entries").emit("remove:dependencies", entry.id, dependencies);
          }
          delete this.server.data.entries.dependenciesByAssetId[entry.id];
        }

        let asset: SupCore.Data.Base.Asset;
        async.series([
          (cb) => {
            if (entry.type != null) {
              this.server.data.assets.acquire(entry.id, null, (err, acquiredAsset) => {
                if (err != null) { cb(err); return; }
                asset = acquiredAsset;
                cb(null);
              });
            } else cb(null);
          }, (cb) => {
            // Delete the entry
            this.server.data.entries.remove(entry.id, (err) => {
              if (err != null) { cb(new Error(err)); return; }

              this.server.io.in("sub:entries").emit("trash:entries", entry.id);

              // Notify and clear all asset subscribers
              let roomName = `sub:assets:${entry.id}`;
              this.server.io.in(roomName).emit("trash:assets", entry.id);

              // NOTE: "SocketIO.Namespace.adapter" is not part of the official documented API
              // It does exist though: https://github.com/Automattic/socket.io/blob/3f72dd3322bcefff07b5976ab817766e421d237b/lib/namespace.js#L89
              for (let socketId in (<any>this.server.io).adapter.rooms[roomName]) {
                let remoteClient = this.server.clientsBySocketId[socketId];
                remoteClient.socket.leave(roomName);
                remoteClient.subscriptions.splice(remoteClient.subscriptions.indexOf(roomName), 1);
              }

              // Generate badges for any assets depending on this entry
              if (dependentAssetIds != null) this.server.markMissingDependency(dependentAssetIds, id);

              // Skip asset destruction & release if trashing a folder
              if (asset == null) { cb(null); return; }

              // NOTE: It is important that we destroy the asset after having removed its entry
              // from the tree so that nobody can subscribe to it after it's been destroyed
              asset.destroy(() => {
                this.server.data.assets.releaseAll(entry.id);
                cb(null);
              });
            });
          }
        ], callback);
      };

      if (entry.type == null) {
        async.each(entry.children, (entry, cb) => { trashEntryRecursively(entry, cb); }
        , finishTrashEntry);
      } else finishTrashEntry(null);
    };

    let trashedAssetFolder = this.server.data.entries.getStoragePathFromId(id);
    let entry = this.server.data.entries.byId[id];
    let gotChildren = entry.type == null && entry.children.length > 0;
    let parentEntry = this.server.data.entries.parentNodesById[id];
    trashEntryRecursively(entry, (err: Error) => {
      if (err != null) { callback(err.message); return; }

      // After the trash on memory, move folder to trashed assets and clean up empty folders
      let deleteFolder = (folderPath: string, callback: (error: string) => void) => {
        fs.readdir(folderPath, (err, files) => {
          if (err != null) {
            if (err.code !== "ENOENT") callback(err.message);
            else callback(null);
            return;
          }

          if (files.length === 0) {
            fs.rmdir(folderPath, (err) => {
              if (err != null) { callback(err.message); return; }
              callback(null);
            });
          } else callback(null);
        });
      };

      if (entry.type != null || gotChildren) {
        this.server.moveAssetFolderToTrash(trashedAssetFolder, (err) => {
          if (err != null) { callback(err.message); return; }

          if (parentEntry != null && parentEntry.children.length === 0)
            deleteFolder(path.join(this.server.projectPath, "assets", this.server.data.entries.getStoragePathFromId(parentEntry.id)), callback);
          else callback(null);
        });
      } else deleteFolder(path.join(this.server.projectPath, "assets", trashedAssetFolder), callback);
    });
  };

  private onSetEntryProperty = (id: string, key: string, value: any, callback: (err: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;
    if (key === "name" && value.indexOf("/") !== -1) { callback("Entry name cannot contain slashes"); return; }

    let oldFullAssetPath = this.server.data.entries.getStoragePathFromId(id);

    this.server.data.entries.setProperty(id, key, value, (err: string, actualValue: any) => {
      if (err != null) { callback(err); return; }

      if (key === "name") this.onEntryChangeFullPath(id, oldFullAssetPath);
      this.server.io.in("sub:entries").emit("setProperty:entries", id, key, actualValue);
      callback(null);
    });
  };

  private onEntryChangeFullPath = (assetId: string, oldFullAssetPath: string, callback?: Function) => {
    let mustScheduleSave = false;

    let scheduledSaveCallback = this.server.scheduledSaveCallbacks[`assets:${assetId}`];
    if (scheduledSaveCallback != null && scheduledSaveCallback.timeoutId != null) {
      clearTimeout(scheduledSaveCallback.timeoutId);
      scheduledSaveCallback.timeoutId = null;
      scheduledSaveCallback.callback = null;
      mustScheduleSave = true;
    }

    let assetPath = this.server.data.entries.getStoragePathFromId(assetId);
    async.series([
      (cb) => {
        let index = assetPath.lastIndexOf("/");
        if (index !== -1) {
          let parentPath = assetPath.slice(0, index);
          mkdirp(path.join(this.server.projectPath, `assets/${parentPath}`), cb);
        } else cb(null);
      }, (cb) => {
        let oldDirPath = path.join(this.server.projectPath, `assets/${oldFullAssetPath}`);
        let dirPath = path.join(this.server.projectPath, `assets/${assetPath}`);

        fs.rename(oldDirPath, dirPath, (err) => {
          if (mustScheduleSave) this.server.scheduleAssetSave(assetId);

          if (callback != null) callback();
        });
      }
    ]);
  };

  // Assets
  private onEditAsset = (id: string, command: string, ...args: any[]) => {
    let callback: (err: string, id?: string) => any = null;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    if (!this.errorIfCant("editAssets", callback)) return;

    let entry = this.server.data.entries.byId[id];
    if (entry == null || entry.type == null) { callback("No such asset"); return; }
    if (command == null) { callback("Invalid command"); return; }

    let commandMethod = this.server.system.data.assetClasses[entry.type].prototype[`server_${command}`];
    if (commandMethod == null) { callback("Invalid command"); return; }
    // if (callback == null) { this.server.log("Ignoring edit:assets command, missing a callback"); return; }

    this.server.data.assets.acquire(id, null, (err, asset) => {
      if (err != null) { callback("Could not acquire asset"); return; }

      commandMethod.call(asset, this, ...args, (err: string, ...callbackArgs: any[]) => {
        this.server.data.assets.release(id, null);
        if (err != null) { callback(err); return; }

        this.server.io.in(`sub:assets:${id}`).emit("edit:assets", id, command, ...callbackArgs);

        // If the first parameter has an id, send it back to the client
        // Useful so that they can grab the thing they created
        // (It's a bit of a hack, but has proven useful)
        callback(null, (callbackArgs[0] != null) ? callbackArgs[0].id : null);
      });
    });
  };

  // Resources
  private onEditResource = (id: string, command: string, ...args: any[]) => {
    let callback: (err: string, id?: string) => any = null;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    if (!this.errorIfCant("editResources", callback)) return;

    if (command == null) { callback("Invalid command"); return; }

    let commandMethod = this.server.system.data.resourceClasses[id].prototype[`server_${command}`];
    if (commandMethod == null) { callback("Invalid command"); return; }
    // if (callback == null) { this.server.log("Ignoring edit:assets command, missing a callback"); return; }

    this.server.data.resources.acquire(id, null, (err, resource) => {
      if (err != null) { callback("Could not acquire resource"); return; }

      commandMethod.call(resource, this, ...args, (err: string, ...callbackArgs: any[]) => {
        this.server.data.resources.release(id, null);
        if (err != null) { callback(err); return; }

        this.server.io.in(`sub:resources:${id}`).emit("edit:resources", id, command, ...callbackArgs);

        // If the first parameter has an id, send it back to the client
        // Useful so that they can grab the thing they created
        // (It's a bit of a hack, but has proven useful)
        callback(null, (callbackArgs[0] != null) ? callbackArgs[0].id : null);
      });
    });
  };

  // Rooms
  private onEditRoom = (id: string, command: string, ...args: any[]) => {
    let callback: (err: string, id?: string) => any = null;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    if (!this.errorIfCant("editRooms", callback)) return;

    if (command == null) { callback("Invalid command"); return; }

    let commandMethod = (<any>SupCore.Data.Room.prototype)[`server_${command}`];
    if (commandMethod == null) { callback("Invalid command"); return; }
    // if (callback == null) { this.server.log("Ignoring edit:rooms command, missing a callback"); return; }

    this.server.data.rooms.acquire(id, null, (err, room) => {
      if (err != null) { callback("Could not acquire room"); return; }

      commandMethod.call(room, this, ...args, (err: string, ...callbackArgs: any[]) => {
        this.server.data.rooms.release(id, null);
        if (err != null) { callback(err); return; }

        this.server.io.in(`sub:rooms:${id}`).emit("edit:rooms", id, command, ...callbackArgs);
        callback(null, (callbackArgs[0] != null) ? callbackArgs[0].id : null);
      });
    });
  };

  // Project
  private onBuildProject = (callback: (err: string, buildId?: string, files?: string[]) => any) => {
    if (!this.errorIfCant("buildProject", callback)) return;

    // this.server.log("Building project...");

    let buildId = this.server.nextBuildId;
    this.server.nextBuildId++;

    let buildPath = `${this.server.buildsPath}/${buildId}`;

    let exportedProject = { name: this.server.data.manifest.pub.name, assets: this.server.data.entries.getForStorage() };

    try { fs.mkdirSync(this.server.buildsPath); } catch (e) { /* Ignore */ }
    try { fs.mkdirSync(buildPath); }
    catch (err) { callback(`Could not create folder for build ${buildId}`); return; }

    fs.mkdirSync(`${buildPath}/assets`);

    let assetIdsToExport: string[] = [];
    this.server.data.entries.walk((entry: SupCore.Data.EntryNode, parent: SupCore.Data.EntryNode) => {
      if (entry.type != null) assetIdsToExport.push(entry.id);
    });

    async.each(assetIdsToExport, (assetId, cb) => {
      this.server.data.assets.acquire(assetId, null, (err: Error, asset: SupCore.Data.Base.Asset) => {
        asset.publish(buildPath, (err) => {
          this.server.data.assets.release(assetId, null);
          cb();
        });
      });
    }, (err) => {
      if (err != null) { callback("Could not export all assets"); return; }

      fs.mkdirSync(`${buildPath}/resources`);

      async.each(Object.keys(this.server.system.data.resourceClasses), (resourceId, cb) => {
        this.server.data.resources.acquire(resourceId, null, (err: Error, resource: SupCore.Data.Base.Resource) => {
          resource.publish(buildPath, (err) => {
            this.server.data.resources.release(resourceId, null);
            cb();
          });
        });
      }, (err) => {
        if (err != null) { callback("Could not export all resources"); return; }

        let json = JSON.stringify(exportedProject, null, 2);
        fs.writeFile(`${buildPath}/project.json`, json, { encoding: "utf8" }, (err) => {
          if (err != null) { callback("Could not save project.json"); return; }

          // this.server.log(`Done generating build ${buildId}...`);

          // Collect paths to all build files
          let files: string[] = [];
          recursiveReaddir(buildPath, (err, entries) => {
            for (let entry of entries) {
              let relativePath = path.relative(buildPath, entry);
              if (path.sep === "\\") relativePath = relativePath.replace(/\\/g, "/");
              files.push(`/builds/${this.server.data.manifest.pub.id}/${buildId}/${relativePath}`);
            }

            files = files.concat(buildFilesBySystem[this.server.system.id]);
            callback(null, buildId.toString(), files);

            // Remove an old build to avoid using too much disk space
            let buildToDeleteId = buildId - config.maxRecentBuilds;
            let buildToDeletePath = `${this.server.buildsPath}/${buildToDeleteId}`;
            rimraf(buildToDeletePath, (err) => {
              if (err != null) {
                this.server.log(`Failed to remove build ${buildToDeleteId}:`);
                this.server.log(err.toString());
              }
            });
          });
        });
      });
    });
  };

  private onVacuumProject = (callback: (err: string, deletedCount?: number) => any) => {
    if (!this.errorIfCant("vacuumProject", callback)) return;

    const trashedAssetsPath = path.join(this.server.projectPath, "trashedAssets");

    fs.readdir(trashedAssetsPath, (err, trashedAssetFolders) => {
      if (err != null) {
        if (err.code === "ENOENT") trashedAssetFolders = [];
        else throw err;
      }

      let removedFolderCount = 0;
      async.each(trashedAssetFolders, (trashedAssetFolder, cb) => {
        let folderPath = path.join(trashedAssetsPath, trashedAssetFolder);
        rimraf(folderPath, (err) => {
          if (err != null) SupCore.log(`Could not delete ${folderPath}.\n${(<any>err).stack}`);
          else removedFolderCount++;
          cb();
        });
      }, () => { callback(null, removedFolderCount); });
    });
  };
}
