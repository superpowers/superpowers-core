import * as fs from "fs";
import * as path from "path";
import * as async from "async";

import * as paths from "./paths";
import authMiddleware from "./authenticate";
import RemoteProjectClient from "./RemoteProjectClient";
import * as schemas from "./schemas";

const saveDelay = 60;

export default class ProjectServer {

  io: SocketIO.Namespace;

  data: {
    manifest: SupCore.data.Manifest;
    internals: SupCore.data.Internals;
    members: SupCore.data.Members;
    entries: SupCore.data.Entries;

    assets: SupCore.data.Assets;
    rooms: SupCore.data.Rooms;
    resources: SupCore.data.Resources;
  };
  projectPath: string;
  buildsPath: string;

  scheduledSaveCallbacks: { [name: string]: { lastTime: number, timeoutId: NodeJS.Timer, callback: (callback: (err: Error) => any) => any } } = {};
  nextClientId = 0;
  clientsBySocketId: { [socketId: string]: RemoteProjectClient } = {};

  constructor(globalIO: SocketIO.Server, folderName: string, manifestData: any, callback: (err: Error) => any) {
    this.projectPath = path.join(paths.projects, folderName);

    this.data = {
      manifest: null,
      internals: null,
      members: null,
      entries: null,

      assets: new SupCore.data.Assets(this),
      rooms: new SupCore.data.Rooms(this),
      resources: new SupCore.data.Resources(this)
    }

    this.data.assets.on("itemLoad", this._onAssetLoaded);
    this.data.rooms.on("itemLoad", this._onRoomLoaded);
    this.data.resources.on("itemLoad", this._onResourceLoaded);

    let migrate = (callback: (err: Error) => any) => {
      // Old projects didn't have a rooms or resources folder
      async.series([
        (cb: Function) => { fs.mkdir(path.join(this.projectPath, "rooms"), (err) => { cb(); }); },
        (cb: Function) => { fs.mkdir(path.join(this.projectPath, "resources"), (err) => { cb(); }); }
      ], callback);
    };

    let loadManifest = (callback: (err: Error) => any) => {
      let done = (data: any) => {
        this.data.manifest = new SupCore.data.Manifest(data);
        this.data.manifest.on("change", this._onManifestChanged);

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

    let loadInternals = (callback: (err: Error) => any) => {
      let internalsData: any = null;

      async.series([

        (cb: (err: Error) => any) => {
          fs.readFile(path.join(this.projectPath, "internals.json"), { encoding: "utf8" }, (err, internalsJSON) => {
            if (err != null) {
              if (err.code !== "ENOENT") { cb(err); return; }
              internalsData = { nextBuildId: 0, nextEntryId: null };
            } else {
              try { internalsData = JSON.parse(internalsJSON); }
              catch(err) { cb(err); return; }
            }

            cb(null);
          });
        },

        (cb: (err: Error) => any) => {
          fs.readdir(this.buildsPath, (err, entryIds) => {
            if (err != null && err.code !== "ENOENT") { cb(err); return; }

            if (entryIds != null) {
              for (let entryId of entryIds) {
                let entryBuildId = parseInt(entryId);
                if (isNaN(entryBuildId)) continue;
                internalsData.nextBuildId = Math.max(entryBuildId + 1, internalsData.nextBuildId);
              }
            }

            cb(null);
          });
        },

      ], (err) => {
        if (err != null) { callback(err); return; }

        this.data.internals = new SupCore.data.Internals(internalsData);
        this.data.internals.on("change", this._onInternalsChanged);

        callback(null);
      });
    };

    let loadMembers = (callback: (err: Error) => any) => {
      fs.readFile(path.join(this.projectPath, "members.json"), { encoding: "utf8" }, (err, membersJSON) => {
        let membersData: any;

        if (err != null) {
          if (err.code !== "ENOENT") { callback(err); return; }
          membersData = [];
        } else {
          try { membersData = JSON.parse(membersJSON); }
          catch(err) { callback(err); return; }
        }

        try { schemas.validate(membersData, "projectMembers"); }
        catch(err) { callback(err); return; }

        this.data.members = new SupCore.data.Members(membersData);
        this.data.members.on("change", this._onMembersChanged);

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

        this.data.entries = new SupCore.data.Entries(entriesData, this.data.internals.pub.nextEntryId);
        this.data.entries.on("change", this._onEntriesChanged);

        // nextEntryId might be null if internals.json could be found
        if (this.data.internals.pub.nextEntryId == null) {
          this.data.internals.pub.nextEntryId = this.data.entries.nextId;
        }

        callback(null);
      });
    };

    let serve = (callback: (err: Error) => any) => {
      // Setup the project"s namespace
      this.io = globalIO.of(`/project:${this.data.manifest.pub.id}`);
      this.io.use(authMiddleware);
      this.io.on("connection", this._onAddSocket);
      callback(null);
    };

    // prepareAssets() must happen after serve()
    // since diagnostics rely on this.io being setup
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

    async.series([ migrate, loadManifest, loadMembers, loadInternals, loadEntries, serve, prepareAssets ], callback);
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
  _onInternalsChanged = () => { this._scheduleSave(saveDelay, "internals", this._saveInternals); };
  _onMembersChanged = () => { this._scheduleSave(saveDelay, "members", this._saveMembers); };
  _onEntriesChanged = () => { this._scheduleSave(saveDelay, "entries", this._saveEntries); };

  _saveManifest = (callback: (err: Error) => any) => {
    let manifestJSON = JSON.stringify(this.data.manifest.pub, null, 2);
    fs.writeFile(path.join(this.projectPath, "manifest.json"), manifestJSON, callback);
  };

  _saveInternals = (callback: (err: Error) => any) => {
    let internalsJSON = JSON.stringify(this.data.internals.pub, null, 2);
    fs.writeFile(path.join(this.projectPath, "internals.json"), internalsJSON, callback);
  };

  _saveMembers = (callback: (err: Error) => any) => {
    let membersJSON = JSON.stringify(this.data.members.pub, null, 2);
    fs.writeFile(path.join(this.projectPath, "members.json"), membersJSON, callback);
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
