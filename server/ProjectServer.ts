import * as fs from "fs";
import * as path from "path";
import * as async from "async";

import * as paths from "./paths";
import authMiddleware from "./authenticate";
import RemoteProjectClient from "./RemoteProjectClient";
import * as schemas from "./schemas";
import migrateProject from "./migrateProject";

const saveDelay = 60;

export default class ProjectServer {

  io: SocketIO.Namespace;

  data: {
    manifest: SupCore.data.Manifest;
    entries: SupCore.data.Entries;

    assets: SupCore.data.Assets;
    rooms: SupCore.data.Rooms;
    resources: SupCore.data.Resources;
  };
  projectPath: string;
  buildsPath: string;
  nextBuildId: number;

  scheduledSaveCallbacks: { [name: string]: { lastTime: number, timeoutId: NodeJS.Timer, callback: (callback: (err: Error) => any) => any } } = {};
  nextClientId = 0;
  clientsBySocketId: { [socketId: string]: RemoteProjectClient } = {};

  constructor(globalIO: SocketIO.Server, folderName: string, manifestData: any, callback: (err: Error) => any) {
    this.projectPath = path.join(paths.projects, folderName);

    this.data = {
      manifest: null,
      entries: null,

      assets: new SupCore.data.Assets(this),
      rooms: new SupCore.data.Rooms(this),
      resources: new SupCore.data.Resources(this)
    }

    this.data.assets.on("itemLoad", this._onAssetLoaded);
    this.data.rooms.on("itemLoad", this._onRoomLoaded);
    this.data.resources.on("itemLoad", this._onResourceLoaded);

    let loadManifest = (callback: (err: Error) => any) => {
      let done = (data: any) => {
        try { this.data.manifest = new SupCore.data.Manifest(data); }
        catch(err) { callback(err); return; }
        this.data.manifest.on("change", this._onManifestChanged);
        if (this.data.manifest.migratedFromFormatVersion != null) this.data.manifest.emit("change");

        this.buildsPath = path.join(paths.builds, this.data.manifest.pub.id);
        callback(null);
      };

      if (manifestData != null) {
        done(manifestData);
        return;
      }

      fs.readFile(path.join(this.projectPath, "manifest.json"), { encoding: "utf8" }, (err, manifestJSON) => {
        if (err != null) { callback(err); return; }

        let manifestData: any;
        try { manifestData = JSON.parse(manifestJSON); }
        catch(err) { callback(err); return; }

        try { schemas.validate(manifestData, "projectManifest"); }
        catch(err) { callback(err); return; }

        done(manifestData);
      });
    };
    
    let setupNextBuildId = (callback: (err: Error) => any) => {
      fs.readdir(this.buildsPath, (err, entryIds) => {
        if (err != null && err.code !== "ENOENT") { callback(err); return; }

        this.nextBuildId = 0;

        if (entryIds != null) {
          for (let entryId of entryIds) {
            let entryBuildId = parseInt(entryId);
            if (isNaN(entryBuildId)) continue;
            this.nextBuildId = Math.max(entryBuildId + 1, this.nextBuildId);
          }
        }

        callback(null);
      });
    };

    let loadEntries = (callback: (err: Error) => any) => {
      fs.readFile(path.join(this.projectPath, "entries.json"), { encoding: "utf8" }, (err, entriesJSON) => {
        if (err != null) { callback(err); return; }

        let entriesData: any;
        try { entriesData = JSON.parse(entriesJSON); }
        catch(err) { callback(err); return; }

        try { schemas.validate(entriesData, "projectEntries"); }
        catch(err) { callback(err); return; }

        this.data.entries = new SupCore.data.Entries(entriesData);
        this.data.entries.on("change", this._onEntriesChanged);

        callback(null);
      });
    };

    // migrate() is called after loadEntries()
    // because some migration code requires the entries to be loaded
    let migrate = (callback: (err: Error) => any) => {
      migrateProject(this, callback);
    };

    let serve = (callback: (err: Error) => any) => {
      // Setup the project's namespace
      this.io = globalIO.of(`/project:${this.data.manifest.pub.id}`);
      this.io.use(authMiddleware);
      this.io.on("connection", this._onAddSocket);
      callback(null);
    };

    // prepareAssets() is called after serve()
    // because diagnostics rely on this.io being setup
    let prepareAssets = (callback: (err: Error) => any) => {
      async.each(Object.keys(this.data.entries.byId), (assetId, cb) => {
        // Ignore folders
        if (this.data.entries.byId[assetId].type == null) { cb(); return; }

        this.data.assets.acquire(assetId, null, (err: Error, asset: SupCore.data.base.Asset) => {
          if (err != null) { cb(err); return; }

          asset.restore();
          this.data.assets.release(assetId, null, { skipUnloadDelay: true });
          cb();
        });
      }, callback);
    };

    async.series([ loadManifest, setupNextBuildId, loadEntries, migrate, serve, prepareAssets ], callback);
  }

  log(message: string) {
    SupCore.log(`[${this.data.manifest.pub.id} ${this.data.manifest.pub.name}] ${message}`);
  }

  save(callback: (err: Error) => any) {
    let saveCallbacks: Array<(callback: (err: Error) => any) => any> = [];

    for (let callbackName in this.scheduledSaveCallbacks) {
      let callbackInfo = this.scheduledSaveCallbacks[callbackName];
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
      
      let folderPath = path.join(assetsPath, trashedAssetFolder);
      let folderNumber = 0;
  
      let renameSuccessful = false;
      async.until(() => renameSuccessful, (cb) => {
        let newFolderPath = path.join(trashedAssetsPath, trashedAssetFolder);
        if (folderNumber > 0) newFolderPath = `${newFolderPath} (${folderNumber})`;
        fs.rename(folderPath, newFolderPath, (err) => {
          if (err != null) folderNumber++;
          else renameSuccessful = true;
          cb();
        });
      }, callback);
    });
  }

  removeRemoteClient(socketId: string) {
    delete this.clientsBySocketId[socketId];
  }

  _onAssetLoaded = (assetId: string, item: SupCore.data.base.Asset) => {
    item.on("change", () => { this.scheduleAssetSave(assetId); });

    item.on("setDiagnostic", (diagnosticId: string, type: string, data: any) => { this._setDiagnostic(assetId, diagnosticId, type, data); });
    item.on("clearDiagnostic", (diagnosticId: string) => { this._clearDiagnostic(assetId, diagnosticId); });

    item.on("addDependencies", (dependencyEntryIds: string[]) => { this._addDependencies(assetId, dependencyEntryIds); });
    item.on("removeDependencies", (dependencyEntryIds: string[]) => { this._removeDependencies(assetId, dependencyEntryIds); });
  };

  _onRoomLoaded = (roomId: string, item: SupCore.data.Room) => {
    let roomPath = path.join(this.projectPath, `rooms/${roomId}`);
    let saveCallback = item.save.bind(item, roomPath);
    item.on("change", () => { this._scheduleSave(saveDelay, `rooms:${roomId}`, saveCallback); });
  }

  _onResourceLoaded = (resourceId: string, item: SupCore.data.base.Resource) => {
    let resourcePath = path.join(this.projectPath, `resources/${resourceId}`);
    let saveCallback = item.save.bind(item, resourcePath);
    item.on("change", () => { this._scheduleSave(saveDelay, `resources:${resourceId}`, saveCallback); });
    item.on("command", (cmd: string, ...callbackArgs: any[]) => { this.io.in(`sub:resources:${resourceId}`).emit("edit:resources", resourceId, cmd, ...callbackArgs); });
  };

  _onAddSocket = (socket: SocketIO.Socket) => {
    let client = new RemoteProjectClient(this, (this.nextClientId++).toString(), socket);
    this.clientsBySocketId[socket.id] = client;
  };

  _scheduleSave = (minimumSecondsElapsed: number, callbackName: string, callback: (callback: (err: Error) => any) => any) => {
    // this.log(`Scheduling a save: ${callbackName}`);

    let scheduledCallback = this.scheduledSaveCallbacks[callbackName];
    if (scheduledCallback != null && scheduledCallback.timeoutId != null) return;

    let errorCallback = (err: Error) => {
      // this.log(`Save done! ${callbackName}`);
      if (err != null) this.log(`Error in ${callbackName}:\n${err}`);
    };

    if (scheduledCallback == null || scheduledCallback.lastTime <= Date.now() - minimumSecondsElapsed * 1000) {
      this.scheduledSaveCallbacks[callbackName] = { lastTime: Date.now(), timeoutId: null, callback: null };
      callback(errorCallback);
    } else {
      let delay = minimumSecondsElapsed * 1000 - (Date.now() - scheduledCallback.lastTime);

      let timeoutId = setTimeout(() => {
        callback(errorCallback);

        scheduledCallback.lastTime = Date.now();
        scheduledCallback.timeoutId = null;
        scheduledCallback.callback = null;
      }, delay);

      scheduledCallback.timeoutId = timeoutId;
      scheduledCallback.callback = callback;
    }
  };

  scheduleAssetSave = (id: string) => {
    let item = this.data.assets.byId[id];
    if (item == null) {
      SupCore.log(`Tried to schedule an asset save for item with id ${id} but the asset is not loaded.`);
      SupCore.log(JSON.stringify(this.data.entries.byId[id], null, 2));
      SupCore.log((<any>new Error()).stack);
      return;
    }
    let assetPath = path.join(this.projectPath, `assets/${this.data.entries.getStoragePathFromId(id)}`);
    let saveCallback = item.save.bind(item, assetPath);
    this._scheduleSave(saveDelay, `assets:${id}`, saveCallback);
  }

  _onManifestChanged = () => { this._scheduleSave(saveDelay, "manifest", this._saveManifest); };
  _onEntriesChanged = () => { this._scheduleSave(saveDelay, "entries", this._saveEntries); };

  _saveManifest = (callback: (err: Error) => any) => {
    let manifestJSON = JSON.stringify(this.data.manifest.pub, null, 2);
    fs.writeFile(path.join(this.projectPath, "manifest.json"), manifestJSON, callback);
  };

  _saveEntries = (callback: (err: Error) => any) => {
    let entriesJSON = JSON.stringify(this.data.entries.getForStorage(), null, 2);
    fs.writeFile(path.join(this.projectPath, "newEntries.json"), entriesJSON, () => {
      fs.rename(path.join(this.projectPath, "newEntries.json"), path.join(this.projectPath, "entries.json"), callback)
    });
  };

  _setDiagnostic(assetId: string, diagnosticId: string, type: string, data: any) {
    // console.log(`_setDiagnostic ${assetId} ${diagnosticId} ${type}`);
    let diagnostics = this.data.entries.diagnosticsByEntryId[assetId];

    let newDiag = { id: diagnosticId, type, data };

    let existingDiag = diagnostics.byId[diagnosticId];
    if (existingDiag != null) {
      existingDiag.type = type;
      existingDiag.data = data;
      this.io.in("sub:entries").emit("set:diagnostics", assetId, newDiag);
      return;
    }

    diagnostics.add(newDiag, null, (err) => {
      this.io.in("sub:entries").emit("set:diagnostics", assetId, newDiag);
    });
  }

  _clearDiagnostic(assetId: string, diagnosticId: string) {
    // console.log(`_clearDiagnostic ${assetId} ${diagnosticId}`);
    let diagnostics = this.data.entries.diagnosticsByEntryId[assetId];

    diagnostics.remove(diagnosticId, (err) => {
      this.io.in("sub:entries").emit("clear:diagnostics", assetId, diagnosticId);
    });
  }

  _addDependencies(assetId: string, dependencyEntryIds: string[]) {
    let addedDependencyEntryIds: string[] = [];
    let missingAssetIds: string[] = [];

    let assetDependencies = this.data.entries.dependenciesByAssetId[assetId];
    if (assetDependencies == null) assetDependencies = this.data.entries.dependenciesByAssetId[assetId] = [];

    for (let depId of dependencyEntryIds) {
      assetDependencies.push(depId);

      let depEntry = this.data.entries.byId[depId];
      if (depEntry == null) { missingAssetIds.push(depId); continue; }

      let dependentAssetIds = depEntry.dependentAssetIds;
      if (dependentAssetIds.indexOf(assetId) === -1) {
        dependentAssetIds.push(assetId);
        addedDependencyEntryIds.push(depId);
      }
    }

    if (missingAssetIds.length > 0) {
      let existingDiag = this.data.entries.diagnosticsByEntryId[assetId].byId["missingDependencies"];
      if (existingDiag != null) missingAssetIds = missingAssetIds.concat(existingDiag.data.missingAssetIds);
      this._setDiagnostic(assetId, "missingDependencies", "error", { missingAssetIds });
    }

    if (addedDependencyEntryIds.length > 0) {
      this.io.in("sub:entries").emit("add:dependencies", assetId, addedDependencyEntryIds);
    }
  }

  _removeDependencies(assetId: string, dependencyEntryIds: string[]) {
    let removedDependencyEntryIds: string[] = [];
    let missingAssetIds: string[] = [];

    let assetDependencies = this.data.entries.dependenciesByAssetId[assetId];
    if (assetDependencies == null) assetDependencies = this.data.entries.dependenciesByAssetId[assetId] = [];

    for (let depId of dependencyEntryIds) {
      assetDependencies.splice(assetDependencies.indexOf(depId), 1);

      let depEntry = this.data.entries.byId[depId];
      if (depEntry == null) { missingAssetIds.push(depId); continue; }

      let dependentAssetIds = depEntry.dependentAssetIds;
      let index = dependentAssetIds.indexOf(assetId);
      if (index !== -1) {
        dependentAssetIds.splice(index, 1);
        removedDependencyEntryIds.push(depId);
      }
    }

    if (missingAssetIds.length > 0) {
      let existingDiag = this.data.entries.diagnosticsByEntryId[assetId].byId["missingDependencies"];
      if (existingDiag != null) {
        for (let missingAssetId of missingAssetIds) {
          let index = existingDiag.data.missingAssetIds.indexOf(missingAssetId);
          if (index !== -1) {
            existingDiag.data.missingAssetIds.splice(index, 1);
          }
        }

        if (existingDiag.data.missingAssetIds.length === 0) this._clearDiagnostic(assetId, "missingDependencies");
        else this._setDiagnostic(assetId, "missingDependencies", "error", existingDiag.data);
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
