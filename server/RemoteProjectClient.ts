import BaseRemoteClient from "./BaseRemoteClient";
import ProjectServer from "./ProjectServer";
import { server as serverConfig } from "./config";
import * as path from "path";
import * as fs from "fs";
import * as rimraf from "rimraf";
import * as async from "async";
import * as recursiveReaddir from "recursive-readdir";

export default class RemoteProjectClient extends BaseRemoteClient {
  server: ProjectServer;
  id: string;

  constructor(server: ProjectServer, id: string, socket: SocketIO.Socket) {
    super(server, socket);
    this.id = id;
    this.socket.emit("welcome", this.id, {
      systemId: this.server.system.id,
      buildPort: serverConfig.buildPort,
      supportsServerBuild: this.server.system.serverBuild != null
    });

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
  }

  // Entries

  private onAddEntry = (name: string, type: string, options: any, callback: (err: string, newId?: string) => any) => {
    this.server.addEntry(this.socket.id, name, type, options, callback);
  }

  private onDuplicateEntry = (newName: string, originalEntryId: string, options: any, callback: (err: string, duplicatedId?: string) => any) => {
    this.server.duplicateEntry(this.socket.id, newName, originalEntryId, options, callback);
  }

  private onMoveEntry = (id: string, parentId: string, index: number, callback: (err: string) => any) => {
    this.server.moveEntry(this.socket.id, id, parentId, index, callback);
  }

  private onTrashEntry = (entryId: string, callback: (err: string) => any) => {
    this.server.trashEntry(this.socket.id, entryId, callback);
  }

  private onSetEntryProperty = (entryId: string, key: string, value: any, callback: (err: string) => any) => {
    if (key === "name") { this.server.renameEntry(this.socket.id, entryId, value, callback); return; }

    if (!this.errorIfCant("editAssets", callback)) return;
    if (value.indexOf("/") !== -1) { callback("Entry name cannot contain slashes"); return; }

    this.server.data.entries.setProperty(entryId, key, value, (err: string, actualValue: any) => {
      if (err != null) { callback(err); return; }

      this.server.io.in("sub:entries").emit("setProperty:entries", entryId, key, actualValue);
      callback(null);
    });
  }

  private onSaveEntry = (entryId: string, revisionName: string, callback: (err: string) => void) => {
    this.server.saveEntry(this.socket.id, entryId, revisionName, callback);
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  private onBuildProject = (callback: (err: string, buildId?: string, files?: string[]) => any) => {
    if (!this.errorIfCant("buildProject", callback)) return;

    // this.server.log("Building project...");

    const buildId = this.server.nextBuildId;
    this.server.nextBuildId++;

    const buildPath = `${this.server.buildsPath}/${buildId}`;

    try { fs.mkdirSync(this.server.buildsPath); } catch (e) { /* Ignore */ }
    try { fs.mkdirSync(buildPath); }
    catch (err) { callback(`Could not create folder for build ${buildId}`); return; }

    this.server.system.serverBuild(this.server, buildPath, (err) => {
      if (err != null) { callback(`Failed to create build ${buildId}: ${err}`); return; }

      // Collect paths to all build files
      let files: string[] = [];

      recursiveReaddir(buildPath, (err, entries) => {
        for (const entry of entries) {
          let relativePath = path.relative(buildPath, entry);
          if (path.sep === "\\") relativePath = relativePath.replace(/\\/g, "/");
          files.push(`/builds/${this.server.data.manifest.pub.id}/${buildId}/${relativePath}`);
        }

        callback(null, buildId.toString());

        // Remove an old build to avoid using too much disk space
        const buildToDeleteId = buildId - serverConfig.maxRecentBuilds;
        const buildToDeletePath = `${this.server.buildsPath}/${buildToDeleteId}`;
        rimraf(buildToDeletePath, (err) => {
          if (err != null) {
            this.server.log(`Failed to remove build ${buildToDeleteId}:`);
            this.server.log(err.toString());
          }
        });
      });
    });
  }
}
