import * as fs from "fs";
import * as path from "path";
import * as async from "async";

import RemoteProjectClient from "./RemoteProjectClient";
import * as schemas from "./schemas";
import migrateProject from "./migrateProject";

const saveDelay = 60;

interface SaveCallback {
  lastTime: number;
  timeoutId: NodeJS.Timer;
  callback: (callback: (err: Error) => any) => any;
}

export default class ProjectServer {
  io: SocketIO.Namespace;
  system: SupCore.System;

  data: ProjectServerData;
  buildsPath: string;
  nextBuildId: number;

  scheduledSaveCallbacks: { [name: string]: SaveCallback } = {};
  nextClientId = 0;
  clientsBySocketId: { [socketId: string]: RemoteProjectClient } = {};

  constructor(globalIO: SocketIO.Server, public projectPath: string, buildsPath: string, callback: (err: Error) => any) {
    this.data = {
      manifest: null,
      entries: null,

      assets: new SupCore.Data.Assets(this),
      rooms: new SupCore.Data.Rooms(this),
      resources: new SupCore.Data.Resources(this)
    };

    this.data.assets.on("itemLoad", this.onAssetLoaded);
    this.data.rooms.on("itemLoad", this.onRoomLoaded);
    this.data.resources.on("itemLoad", this.onResourceLoaded);

    const loadManifest = (callback: (err: Error) => any) => {
      const done = (data: any) => {
        try { this.data.manifest = new SupCore.Data.ProjectManifest(data); }
        catch (err) { callback(err); return; }
        this.data.manifest.on("change", this.onManifestChanged);
        if (this.data.manifest.migratedFromFormatVersion != null) this.data.manifest.emit("change");

        this.system = SupCore.systems[this.data.manifest.pub.systemId];
        if (this.system == null) {
          callback(new Error(`The system ${this.data.manifest.pub.systemId} is not installed.`));
        } else {
          this.buildsPath = path.join(buildsPath, this.data.manifest.pub.id);
          callback(null);
        }
      };

      fs.readFile(path.join(this.projectPath, "manifest.json"), { encoding: "utf8" }, (err, manifestJSON) => {
        if (err != null) { callback(err); return; }

        let manifestData: SupCore.Data.ProjectManifest;
        try { manifestData = JSON.parse(manifestJSON); }
        catch (err) { callback(err); return; }

        try { schemas.validate(manifestData, "projectManifest"); }
        catch (err) { callback(err); return; }

        done(manifestData);
      });
    };

    const setupNextBuildId = (callback: (err: Error) => any) => {
      fs.readdir(this.buildsPath, (err, entryIds) => {
        if (err != null && err.code !== "ENOENT") { callback(err); return; }

        this.nextBuildId = 0;

        if (entryIds != null) {
          for (const entryId of entryIds) {
            const entryBuildId = parseInt(entryId, 10);
            if (isNaN(entryBuildId)) continue;
            this.nextBuildId = Math.max(entryBuildId + 1, this.nextBuildId);
          }
        }

        callback(null);
      });
    };

    const ensureRequiredFoldersExist = (callback: (err: Error) => any) => {
      // These folders might not exist if the project was checked out from source control
      // But we assume they do when saving resources or rooms, so let's recreate them.
      const folders = [ "resources", "rooms" ];
      async.each(folders, (folder, cb) => {
        fs.mkdir(path.join(this.projectPath, folder), (err) => {
          if (err != null && err.code !== "EEXIST") { cb(err); return; }
          cb();
        });
      }, callback);
    };

    const loadEntries = (callback: (err: Error) => any) => {
      fs.readFile(path.join(this.projectPath, "entries.json"), { encoding: "utf8" }, (err, entriesJSON) => {
        if (err != null) { callback(err); return; }

        let entriesData: any;
        try { entriesData = JSON.parse(entriesJSON); }
        catch (err) { callback(err); return; }

        if (this.data.manifest.migratedFromFormatVersion != null && this.data.manifest.migratedFromFormatVersion <= 5) {
          let nextEntryId = 0;
          let walk = (node: SupCore.Data.EntryNode) => {
            const intNodeId = parseInt(node.id, 10);
            nextEntryId = Math.max(nextEntryId, intNodeId);

            if (node.type == null) for (const childNode of node.children) walk(childNode);
          };
          for (const node of entriesData) walk(node);
          nextEntryId++;

          entriesData = { nextEntryId, nodes: entriesData };
        }

        try { schemas.validate(entriesData, "projectEntries"); }
        catch (err) { callback(err); return; }

        this.data.entries = new SupCore.Data.Entries(entriesData.nodes, entriesData.nextEntryId, this);
        this.data.entries.on("change", this.onEntriesChanged);

        if (this.data.manifest.migratedFromFormatVersion != null && this.data.manifest.migratedFromFormatVersion <= 5) {
          this.saveEntries(callback);
        } else {
          callback(null);
        }
      });
    };

    // migrate() is called after loadEntries()
    // because some migration code requires the entries to be loaded
    const migrate = (callback: (err: Error) => any) => {
      migrateProject(this, callback);
    };

    const serve = (callback: (err: Error) => any) => {
      // Setup the project's namespace
      this.io = globalIO.of(`/project:${this.data.manifest.pub.id}`);
      this.io.on("connection", this.onAddSocket);
      callback(null);
    };

    // prepareAssets() and prepareResources() is called after serve()
    // because badges rely on this.io being setup
    const prepareAssets = (callback: (err: Error) => any) => {
      async.each(Object.keys(this.data.entries.byId), (assetId, cb) => {
        // Ignore folders
        if (this.data.entries.byId[assetId].type == null) { cb(); return; }

        this.data.assets.acquire(assetId, null, (err: Error, asset: SupCore.Data.Base.Asset) => {
          if (err != null) { cb(err); return; }

          asset.restore();
          this.data.assets.release(assetId, null, { skipUnloadDelay: true });
          cb();
        });
      }, callback);
    };

    const prepareResources = (callback: (err: Error) => any) => {
      async.each(Object.keys(this.system.data.resourceClasses), (resourceId, cb) => {
        this.data.resources.acquire(resourceId, null, (err: Error, resource: SupCore.Data.Base.Resource) => {
          if (err != null) { cb(err); return; }

          resource.restore();
          this.data.resources.release(resourceId, null, { skipUnloadDelay: true });
          cb();
        });
      }, callback);
    };

    async.series([
      loadManifest, setupNextBuildId,
      ensureRequiredFoldersExist,
      loadEntries, migrate, serve,
      prepareAssets, prepareResources
    ], callback);
  }

  log(message: string) {
    SupCore.log(`[${this.data.manifest.pub.id} ${this.data.manifest.pub.name}] ${message}`);
  }

  save(callback: (err: Error) => any) {
    const saveCallbacks: Array<(callback: (err: Error) => any) => any> = [];

    for (const callbackName in this.scheduledSaveCallbacks) {
      const callbackInfo = this.scheduledSaveCallbacks[callbackName];
      if (callbackInfo.timeoutId == null) continue;

      clearTimeout(callbackInfo.timeoutId);
      saveCallbacks.push(callbackInfo.callback);
    }

    this.scheduledSaveCallbacks = {};

    async.parallel(saveCallbacks, callback);
  }

  moveAssetFolderToTrash(trashedAssetFolder: string, callback: (err: Error) => any) {
    const assetsPath = path.join(this.projectPath, "assets");
    const trashedAssetsPath = path.join(this.projectPath, "trashedAssets");

    fs.mkdir(trashedAssetsPath, (err) => {
      if (err != null && err.code !== "EEXIST") throw err;

      const folderPath = path.join(assetsPath, trashedAssetFolder);
      let folderNumber = 0;

      let renameSuccessful = false;
      async.until(() => renameSuccessful, (cb) => {
        const index = trashedAssetFolder.lastIndexOf("/");
        if (index !== -1) trashedAssetFolder = trashedAssetFolder.slice(index);
        let newFolderPath = path.join(trashedAssetsPath, trashedAssetFolder);

        if (folderNumber > 0) newFolderPath = `${newFolderPath} (${folderNumber})`;
        fs.rename(folderPath, newFolderPath, (err) => {
          if (err != null) folderNumber++;
          else renameSuccessful = true;

          if (folderNumber > 1000) callback(new Error(`Couldn't trash asset: ${trashedAssetFolder}`));
          else cb();
        });
      }, callback);
    });
  }

  removeRemoteClient(socketId: string) {
    delete this.clientsBySocketId[socketId];
  }

  markMissingDependency(dependentAssetIds: string[], missingAssetId: string) {
    for (const dependentAssetId of dependentAssetIds) {
      let missingAssetIds = [ missingAssetId ];
      const existingBadge = this.data.entries.badgesByEntryId[dependentAssetId].byId["missingDependencies"];
      if (existingBadge != null) { missingAssetIds = missingAssetIds.concat(existingBadge.data.missingAssetIds); };
      this.setBadge(dependentAssetId, "missingDependencies", "error", { missingAssetIds });
    }
  }

  scheduleAssetSave = (id: string) => {
    const item = this.data.assets.byId[id];
    if (item == null) {
      SupCore.log(`Tried to schedule an asset save for item with id ${id} but the asset is not loaded.`);
      SupCore.log(JSON.stringify(this.data.entries.byId[id], null, 2));
      SupCore.log((new Error() as any).stack);
      return;
    }
    const assetPath = path.join(this.projectPath, `assets/${this.data.entries.getStoragePathFromId(id)}`);
    const saveCallback = item.save.bind(item, assetPath);
    this.scheduleSave(saveDelay, `assets:${id}`, saveCallback);
  };

  private onAssetLoaded = (assetId: string, item: SupCore.Data.Base.Asset) => {
    item.on("change", () => { this.scheduleAssetSave(assetId); });
    item.on("edit", (commandName: string, ...args: any[]) => { this.io.in(`sub:assets:${assetId}`).emit("edit:assets", assetId, commandName, ...args); });

    item.on("setBadge", (badgeId: string, type: string, data: any) => { this.setBadge(assetId, badgeId, type, data); });
    item.on("clearBadge", (badgeId: string) => { this.clearBadge(assetId, badgeId); });

    item.on("addDependencies", (dependencyEntryIds: string[]) => { this.addDependencies(assetId, dependencyEntryIds); });
    item.on("removeDependencies", (dependencyEntryIds: string[]) => { this.removeDependencies(assetId, dependencyEntryIds); });
  };

  private onRoomLoaded = (roomId: string, item: SupCore.Data.Room) => {
    const roomPath = path.join(this.projectPath, `rooms/${roomId}`);
    const saveCallback = item.save.bind(item, roomPath);
    item.on("change", () => { this.scheduleSave(saveDelay, `rooms:${roomId}`, saveCallback); });
  };

  private onResourceLoaded = (resourceId: string, item: SupCore.Data.Base.Resource) => {
    const resourcePath = path.join(this.projectPath, `resources/${resourceId}`);
    const saveCallback = item.save.bind(item, resourcePath);
    item.on("change", () => { this.scheduleSave(saveDelay, `resources:${resourceId}`, saveCallback); });
    item.on("edit", (commandName: string, ...args: any[]) => { this.io.in(`sub:resources:${resourceId}`).emit("edit:resources", resourceId, commandName, ...args); });

    item.on("setAssetBadge", (assetId: string, badgeId: string, type: string, data: any) => { this.setBadge(assetId, badgeId, type, data); });
    item.on("clearAssetBadge", (assetId: string, badgeId: string) => { this.clearBadge(assetId, badgeId); });
  };

  private onAddSocket = (socket: SocketIO.Socket) => {
    const client = new RemoteProjectClient(this, (this.nextClientId++).toString(), socket);
    this.clientsBySocketId[socket.id] = client;
  };

  private scheduleSave = (minimumSecondsElapsed: number, callbackName: string, callback: (callback: (err: Error) => any) => any) => {
    // this.log(`Scheduling a save: ${callbackName}`);

    const scheduledCallback = this.scheduledSaveCallbacks[callbackName];
    if (scheduledCallback != null && scheduledCallback.timeoutId != null) return;

    const errorCallback = (err: Error) => {
      // this.log(`Save done! ${callbackName}`);
      if (err != null) this.log(`Error in ${callbackName}:\n${err}`);
    };

    if (scheduledCallback == null || scheduledCallback.lastTime <= Date.now() - minimumSecondsElapsed * 1000) {
      this.scheduledSaveCallbacks[callbackName] = { lastTime: Date.now(), timeoutId: null, callback: null };
      callback(errorCallback);
    } else {
      const delay = minimumSecondsElapsed * 1000 - (Date.now() - scheduledCallback.lastTime);

      const timeoutId = setTimeout(() => {
        callback(errorCallback);

        scheduledCallback.lastTime = Date.now();
        scheduledCallback.timeoutId = null;
        scheduledCallback.callback = null;
      }, delay);

      scheduledCallback.timeoutId = timeoutId;
      scheduledCallback.callback = callback;
    }
  };

  private onManifestChanged = () => { this.scheduleSave(saveDelay, "manifest", this.saveManifest); };
  private onEntriesChanged = () => { this.scheduleSave(saveDelay, "entries", this.saveEntries); };

  private saveManifest = (callback: (err: Error) => any) => {
    const manifestJSON = JSON.stringify(this.data.manifest.pub, null, 2);
    fs.writeFile(path.join(this.projectPath, "manifest.json"), manifestJSON, callback);
  };

  private saveEntries = (callback: (err: Error) => any) => {
    const entriesJSON = JSON.stringify({ nextEntryId: this.data.entries.nextId, nodes: this.data.entries.getForStorage() }, null, 2);
    fs.writeFile(path.join(this.projectPath, "newEntries.json"), entriesJSON, () => {
      fs.rename(path.join(this.projectPath, "newEntries.json"), path.join(this.projectPath, "entries.json"), callback);
    });
  };

  private setBadge(assetId: string, badgeId: string, type: string, data: any) {
    // console.log(`setBadge ${assetId} ${badgeId} ${type}`);
    const badges = this.data.entries.badgesByEntryId[assetId];

    const newBadge = { id: badgeId, type, data };

    const existingBadge = badges.byId[badgeId];
    if (existingBadge != null) {
      existingBadge.type = type;
      existingBadge.data = data;
      this.io.in("sub:entries").emit("set:badges", assetId, newBadge);
      return;
    }

    badges.add(newBadge, null, (err) => {
      this.io.in("sub:entries").emit("set:badges", assetId, newBadge);
    });
  }

  private clearBadge(assetId: string, badgeId: string) {
    // console.log(`clearBadge ${assetId} ${badgeId}`);
    const badges = this.data.entries.badgesByEntryId[assetId];

    badges.remove(badgeId, (err) => {
      this.io.in("sub:entries").emit("clear:badges", assetId, badgeId);
    });
  }

  private addDependencies(assetId: string, dependencyEntryIds: string[]) {
    const addedDependencyEntryIds: string[] = [];
    let missingAssetIds: string[] = [];

    let assetDependencies = this.data.entries.dependenciesByAssetId[assetId];
    if (assetDependencies == null) assetDependencies = this.data.entries.dependenciesByAssetId[assetId] = [];

    for (const depId of dependencyEntryIds) {
      assetDependencies.push(depId);

      const depEntry = this.data.entries.byId[depId];
      if (depEntry == null) { missingAssetIds.push(depId); continue; }

      const dependentAssetIds = depEntry.dependentAssetIds;
      if (dependentAssetIds.indexOf(assetId) === -1) {
        dependentAssetIds.push(assetId);
        addedDependencyEntryIds.push(depId);
      }
    }

    if (missingAssetIds.length > 0) {
      const existingBadge = this.data.entries.badgesByEntryId[assetId].byId["missingDependencies"];
      if (existingBadge != null) missingAssetIds = missingAssetIds.concat(existingBadge.data.missingAssetIds);
      this.setBadge(assetId, "missingDependencies", "error", { missingAssetIds });
    }

    if (addedDependencyEntryIds.length > 0) {
      this.io.in("sub:entries").emit("add:dependencies", assetId, addedDependencyEntryIds);
    }
  }

  private removeDependencies(assetId: string, dependencyEntryIds: string[]) {
    const removedDependencyEntryIds: string[] = [];
    const missingAssetIds: string[] = [];

    let assetDependencies = this.data.entries.dependenciesByAssetId[assetId];
    if (assetDependencies == null) assetDependencies = this.data.entries.dependenciesByAssetId[assetId] = [];

    for (const depId of dependencyEntryIds) {
      assetDependencies.splice(assetDependencies.indexOf(depId), 1);

      const depEntry = this.data.entries.byId[depId];
      if (depEntry == null) { missingAssetIds.push(depId); continue; }

      const dependentAssetIds = depEntry.dependentAssetIds;
      const index = dependentAssetIds.indexOf(assetId);
      if (index !== -1) {
        dependentAssetIds.splice(index, 1);
        removedDependencyEntryIds.push(depId);
      }
    }

    if (missingAssetIds.length > 0) {
      const existingBadge = this.data.entries.badgesByEntryId[assetId].byId["missingDependencies"];
      if (existingBadge != null) {
        for (const missingAssetId of missingAssetIds) {
          const index = existingBadge.data.missingAssetIds.indexOf(missingAssetId);
          if (index !== -1) {
            existingBadge.data.missingAssetIds.splice(index, 1);
          }
        }

        if (existingBadge.data.missingAssetIds.length === 0) this.clearBadge(assetId, "missingDependencies");
        else this.setBadge(assetId, "missingDependencies", "error", existingBadge.data);
      }
    }

    if (removedDependencyEntryIds.length > 0) {
      this.io.in("sub:entries").emit("remove:dependencies", assetId, removedDependencyEntryIds);
    }

    if (assetDependencies.length === 0) {
      delete this.data.entries.dependenciesByAssetId[assetId];
    }
  }
}
