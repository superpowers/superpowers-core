import { EventEmitter } from "events";

export default class Dictionary extends EventEmitter {
  byId: { [key: string]: any; };
  refCountById: { [key: string]: number; };
  unloadDelaySeconds: number;
  unloadTimeoutsById: {[id: string]: NodeJS.Timer} = {};

  constructor(unloadDelaySeconds = 60) {
    super();
    this.byId = {};
    this.refCountById = {};
    this.unloadDelaySeconds = unloadDelaySeconds;
  }

  acquire(id: string, owner: any, callback: (err: Error, item: any) => any) {
    if (this.refCountById[id] == null) this.refCountById[id] = 0;
    this.refCountById[id]++;
    // console.log(`Acquiring ${id}: ${this.refCountById[id]} refs`);

    // Cancel pending unload timeout if any
    let timeout = this.unloadTimeoutsById[id];
    if (timeout != null) {
      // console.log(`Cancelling unload timeout for ${id}`);
      clearTimeout(timeout);
      delete this.unloadTimeoutsById[id];
    }

    let item = this.byId[id];

    if (item == null) {
      try { item = this._load(id); }
      catch (e) { callback(e, null); return; }
      this.byId[id] = item;

      item.on("load", () => {
        // Bail if entry was evicted from the cache
        if (this.byId[id] == null) return;
        this.emit("itemLoad", id, item);
      });
    }

    if (item.pub != null) callback(null, item);
    else item.on("load", () => {
      // Bail if entry was evicted from the cache
      if (this.byId[id] == null) return;
      callback(null, item);
      return;
    });
  }

  release(id: string, owner: any, options?: {skipUnloadDelay: boolean}) {
    if (this.refCountById[id] == null) {
      // This might happen if .releaseAll(id) was called elsewhere since we called acquire
      // Just log and ignore
      console.log(`Can't release ${id}, ref count is null`);
      return;
    }

    this.refCountById[id]--;
    // console.log(`Releasing ${id}: ${this.refCountById[id]} refs left`);

    if (this.refCountById[id] === 0) {
      delete this.refCountById[id];

      // Schedule unloading the asset after a while
      if (options != null && options.skipUnloadDelay) this._unload(id);
      else this.unloadTimeoutsById[id] = setTimeout(() => { this._unload(id); }, this.unloadDelaySeconds * 1000);
    }
  }

  _load(id: string) { throw new Error("This method must be overridden by derived classes"); }

  _unload(id: string) {
    // console.log(`Unloading ${id}`);
    this.byId[id].unload();
    delete this.byId[id];
    delete this.unloadTimeoutsById[id];
  }

  releaseAll(id: string) {
    // Cancel pending unload timeout if any
    let timeout = this.unloadTimeoutsById[id];
    if (timeout != null) {
      clearTimeout(timeout);
      delete this.unloadTimeoutsById[id];
    }

    delete this.refCountById[id];
    delete this.byId[id];
  }
}
