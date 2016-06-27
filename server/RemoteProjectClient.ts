import BaseRemoteClient from "./BaseRemoteClient";
import ProjectServer from "./ProjectServer";
import { server as serverConfig } from "./config";
import * as path from "path";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as rimraf from "rimraf";
import * as async from "async";

export default class RemoteProjectClient extends BaseRemoteClient {
  server: ProjectServer;
  id: string;

  constructor(server: ProjectServer, id: string, socket: SocketIO.Socket) {
    super(server, socket);
    this.id = id;
    this.socket.emit("welcome", this.id, { buildPort: serverConfig.buildPort, systemId: this.server.system.id });

    // Manifest
    this.socket.on("setProperty:manifest", this.onSetManifestProperty);

    // Entries
    this.socket.on("add:entries", this.onAddEntry);
    this.socket.on("duplicate:entries", this.onDuplicateEntry);
    this.socket.on("move:entries", this.onMoveEntry);
    this.socket.on("trash:entries", this.onTrashEntry);
    this.socket.on("setProperty:entries", this.onSetEntryProperty);
    this.socket.on("save:entries", this.onSaveEntry);

    // Assets
    this.socket.on("edit:assets", this.onEditAsset);
    this.socket.on("restore:assets", this.onRestoreAsset);
    this.socket.on("getRevision:assets", this.onGetAssetRevision);

    // Resources
    this.socket.on("edit:resources", this.onEditResource);

    // Rooms
    this.socket.on("edit:rooms", this.onEditRoom);

    // Project
    this.socket.on("vacuum:project", this.onVacuumProject);
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

    const entry: SupCore.Data.EntryNode = { id: null, name, type, badges: [], dependentAssetIds: [] };
    if (options == null) options = {};

    this.server.data.entries.add(entry, options.parentId, options.index, (err: string, actualIndex: number) => {
      if (err != null) { callback(err, null); return; }

      const onEntryCreated = () => {
        this.server.io.in("sub:entries").emit("add:entries", entry, options.parentId, actualIndex);
        callback(null, entry.id);
      };

      if (entry.type != null) {
        const assetClass = this.server.system.data.assetClasses[entry.type];
        const asset = new assetClass(entry.id, null, this.server);
        asset.init({ name: entry.name }, () => {
          const assetPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(entry.id)}`);
          mkdirp(assetPath, () => { asset.save(assetPath, onEntryCreated); });
        });
      } else {
        onEntryCreated();
      }
    });
  };

  private onDuplicateEntry = (newName: string, id: string, options: any, callback: (err: string, duplicatedId?: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;

    const entryToDuplicate = this.server.data.entries.byId[id];
    if (entryToDuplicate == null) { callback(`Entry ${id} doesn't exist`); return; }
    if (entryToDuplicate.type == null) { callback("Entry to duplicate must be an asset"); return; }

    const entry: SupCore.Data.EntryNode = {
      id: null, name: newName, type: entryToDuplicate.type,
      badges: [], dependentAssetIds: []
    };

    if (options == null) options = {};

    this.server.data.entries.add(entry, options.parentId, options.index, (err: string, actualIndex: number) => {
      if (err != null) { callback(err); return; }

      const newAssetPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(entry.id)}`);
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
              this.server.data.assets.release(entry.id, null);

              this.server.io.in("sub:entries").emit("add:entries", entry, options.parentId, actualIndex);
              newAsset.restore();
              callback(null, entry.id);
            });
          });
        });
      });
    });
  };

  private onMoveEntry = (id: string, parentId: string, index: number, callback: (err: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;

    const oldFullAssetPath = this.server.data.entries.getStoragePathFromId(id);
    const oldParent = this.server.data.entries.parentNodesById[id];

    this.server.data.entries.move(id, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      this.onEntryChangeFullPath(id, oldFullAssetPath, () => {
        if (oldParent == null || oldParent.children.length > 0) return;

        const oldParentPath = path.join(this.server.projectPath, `assets/${this.server.data.entries.getStoragePathFromId(oldParent.id)}`);
        fs.readdir(oldParentPath, (err, files) => { if (files.length === 0) fs.rmdir(oldParentPath); });
      });
      this.server.io.in("sub:entries").emit("move:entries", id, parentId, actualIndex);
      callback(null);
    });
  };

  private onTrashEntry = (id: string, callback: (err: string) => any) => {
    if (!this.errorIfCant("editAssets", callback)) return;

    const trashEntryRecursively = (entry: SupCore.Data.EntryNode, callback: (err: Error) => void) => {
      const finishTrashEntry = (err: Error) => {
        if (err != null) { callback(err); return; }

        // Clear all dependencies for this entry
        const dependentAssetIds = (entry != null) ? entry.dependentAssetIds : null;

        const dependencies = this.server.data.entries.dependenciesByAssetId[entry.id];
        if (dependencies != null) {
          const removedDependencyEntryIds = [] as string[];
          for (const depId of dependencies) {
            const depEntry = this.server.data.entries.byId[depId];
            if (depEntry == null) continue;

            const dependentAssetIds = depEntry.dependentAssetIds;
            const index = dependentAssetIds.indexOf(entry.id);
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
              const roomName = `sub:assets:${entry.id}`;
              this.server.io.in(roomName).emit("trash:assets", entry.id);

              const room = this.server.io.adapter.rooms[roomName]; // room is null when the asset isn't open in any client
              if (room != null) {
                for (const socketId in room.sockets) {
                  const remoteClient = this.server.clientsBySocketId[socketId];
                  remoteClient.socket.leave(roomName);
                  remoteClient.subscriptions.splice(remoteClient.subscriptions.indexOf(roomName), 1);
                }
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

    const trashedAssetFolder = this.server.data.entries.getStoragePathFromId(id);
    const entry = this.server.data.entries.byId[id];
    const gotChildren = entry.type == null && entry.children.length > 0;
    const parentEntry = this.server.data.entries.parentNodesById[id];
    trashEntryRecursively(entry, (err: Error) => {
      if (err != null) { callback(err.message); return; }

      // After the trash on memory, move folder to trashed assets and clean up empty folders
      const deleteFolder = (folderPath: string, callback: (error: string) => void) => {
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

    const oldFullAssetPath = this.server.data.entries.getStoragePathFromId(id);

    this.server.data.entries.setProperty(id, key, value, (err: string, actualValue: any) => {
      if (err != null) { callback(err); return; }

      if (key === "name") this.onEntryChangeFullPath(id, oldFullAssetPath);
      this.server.io.in("sub:entries").emit("setProperty:entries", id, key, actualValue);
      callback(null);
    });
  };

  private onEntryChangeFullPath = (assetId: string, oldFullAssetPath: string, callback?: Function) => {
    let mustScheduleSave = false;

    const scheduledSaveCallback = this.server.scheduledSaveCallbacks[`assets:${assetId}`];
    if (scheduledSaveCallback != null && scheduledSaveCallback.timeoutId != null) {
      clearTimeout(scheduledSaveCallback.timeoutId);
      scheduledSaveCallback.timeoutId = null;
      scheduledSaveCallback.callback = null;
      mustScheduleSave = true;
    }

    const assetPath = this.server.data.entries.getStoragePathFromId(assetId);
    async.series([
      (cb) => {
        const index = assetPath.lastIndexOf("/");
        if (index !== -1) {
          const parentPath = assetPath.slice(0, index);
          mkdirp(path.join(this.server.projectPath, `assets/${parentPath}`), cb);
        } else cb(null);
      }, (cb) => {
        const oldDirPath = path.join(this.server.projectPath, `assets/${oldFullAssetPath}`);
        const dirPath = path.join(this.server.projectPath, `assets/${assetPath}`);

        fs.rename(oldDirPath, dirPath, (err) => {
          if (mustScheduleSave) this.server.scheduleAssetSave(assetId);

          if (callback != null) callback();
        });
      }
    ]);
  };

  private onSaveEntry = (entryId: string, revisionName: string, callback: (err: string) => void) => {
    if (!this.errorIfCant("editAssets", callback)) return;
    if (revisionName.length === 0) { callback("Revision name can't be empty"); return; }

    this.server.data.entries.save(entryId, revisionName, (err, revisionId) => {
      if (err != null) { callback(err); return; }

      this.server.data.assets.acquire(entryId, null, (err, asset) => {
        if (err != null) { callback("Could not acquire asset"); return; }

        this.server.data.assets.release(entryId, null);

        const revisionPath = path.join(this.server.projectPath, `assetRevisions/${entryId}/${revisionId}-${revisionName}`);
        mkdirp(revisionPath, (err) => {
          if (err != null) { callback("Could not write the save"); return; }

          asset.save(revisionPath, (err: Error) => {
            if (err != null) {
              callback("Could not write the save");
              console.log(err);
              return;
            }

            this.server.io.in("sub:entries").emit("save:entries", entryId, revisionId, revisionName);
            callback(null);
          });
        });
      });
    });
  };

  // Assets
  private onEditAsset = (id: string, command: string, ...args: any[]) => {
    let callback: (err: string, id?: string) => any = null;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    if (!this.errorIfCant("editAssets", callback)) return;

    const entry = this.server.data.entries.byId[id];
    if (entry == null || entry.type == null) { callback("No such asset"); return; }
    if (command == null) { callback("Invalid command"); return; }

    const commandMethod = this.server.system.data.assetClasses[entry.type].prototype[`server_${command}`];
    if (commandMethod == null) { callback("Invalid command"); return; }
    // if (callback == null) { this.server.log("Ignoring edit:assets command, missing a callback"); return; }

    this.server.data.assets.acquire(id, null, (err, asset) => {
      if (err != null) { callback("Could not acquire asset"); return; }

      commandMethod.call(asset, this, ...args, (err: string, ack: any, ...callbackArgs: any[]) => {
        this.server.data.assets.release(id, null);
        if (err != null) { callback(err); return; }

        this.server.io.in(`sub:assets:${id}`).emit("edit:assets", id, command, ...callbackArgs);
        callback(null, ack);
      });
    });
  };

  private onRestoreAsset = (assetId: string, revisionId: string, callback: (err: string) => void) => {
    const entry = this.server.data.entries.byId[assetId];
    if (entry == null || entry.type == null) { callback("No such asset"); return; }

    const assetClass = this.server.system.data.assetClasses[entry.type];
    const newAsset = new assetClass(assetId, null, this.server);

    const revisionName = this.server.data.entries.revisionsByEntryId[assetId][revisionId];
    const revisionPath = `assetRevisions/${assetId}/${revisionId}-${revisionName}`;
    newAsset.load(path.join(this.server.projectPath, revisionPath));
    newAsset.on("load", () => {
      this.server.data.assets.acquire(assetId, null, (err, asset) => {
        if (err != null) { callback("Could not acquire asset"); return; }

        this.server.data.assets.release(assetId, null);

        for (const badge of entry.badges) asset.emit("clearBadge", badge.id);
        entry.badges.length = 0;

        asset.pub = newAsset.pub;
        asset.setup();
        asset.restore();
        asset.emit("change");

        this.server.io.in(`sub:assets:${assetId}`).emit("restore:assets", assetId, entry.type, asset.pub);
        callback(null);
      });
    });
  };

  private onGetAssetRevision = (assetId: string, revisionId: string, callback: (err: string, assetData?: any) => void) => {
    const entry = this.server.data.entries.byId[assetId];
    if (entry == null || entry.type == null) { callback("No such asset"); return; }

    const assetClass = this.server.system.data.assetClasses[entry.type];
    const revisionAsset = new assetClass(assetId, null, this.server);

    const revisionName = this.server.data.entries.revisionsByEntryId[assetId][revisionId];
    const revisionPath = `assetRevisions/${assetId}/${revisionId}-${revisionName}`;
    revisionAsset.load(path.join(this.server.projectPath, revisionPath));
    revisionAsset.on("load", () => { callback(null, revisionAsset.pub); });
  }

  // Resources
  private onEditResource = (id: string, command: string, ...args: any[]) => {
    let callback: (err: string, id?: string) => any = null;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    if (!this.errorIfCant("editResources", callback)) return;

    if (command == null) { callback("Invalid command"); return; }

    const commandMethod = this.server.system.data.resourceClasses[id].prototype[`server_${command}`];
    if (commandMethod == null) { callback("Invalid command"); return; }
    // if (callback == null) { this.server.log("Ignoring edit:assets command, missing a callback"); return; }

    this.server.data.resources.acquire(id, null, (err, resource) => {
      if (err != null) { callback("Could not acquire resource"); return; }

      commandMethod.call(resource, this, ...args, (err: string, ack: any, ...callbackArgs: any[]) => {
        this.server.data.resources.release(id, null);
        if (err != null) { callback(err); return; }

        this.server.io.in(`sub:resources:${id}`).emit("edit:resources", id, command, ...callbackArgs);
        callback(null, ack);
      });
    });
  };

  // Rooms
  private onEditRoom = (id: string, command: string, ...args: any[]) => {
    let callback: (err: string, id?: string) => any = null;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    if (!this.errorIfCant("editRooms", callback)) return;

    if (command == null) { callback("Invalid command"); return; }

    const commandMethod = (SupCore.Data.Room.prototype as any)[`server_${command}`];
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
        const folderPath = path.join(trashedAssetsPath, trashedAssetFolder);
        rimraf(folderPath, (err) => {
          if (err != null) SupCore.log(`Could not delete ${folderPath}.\n${(err as any).stack}`);
          else removedFolderCount++;
          cb();
        });
      }, () => { callback(null, removedFolderCount); });
    });
  };
}
