interface EntriesSubscriber {
  onEntriesReceived(entries: SupCore.data.Entries): void;
  onEntryAdded(entry: any, parentId: string, index: number): void;
  onEntryMoved(id: string, parentId: string, index: number): void;
  onSetEntryProperty(id: string, key: string, value: any): void;
  onEntryTrashed(id: string): void;
}

interface AssetSubscriber {
  onAssetReceived(assetId: string, asset: any): void;
  onAssetEdited(assetId: string, command: string, ...args: any[]): void;
  onAssetTrashed(assetId: string): void;
}

interface ResourceSubscriber {
  onResourceReceived(resourceId: string, resource: any): void;
  onResourceEdited(resourceId: string, command: string, ...args: any[]): void;
}

export default class ProjectClient {
  socket: SocketIOClient.Socket;

  entries: SupCore.data.Entries;
  entriesSubscribers: EntriesSubscriber[] = [];

  assetsById: { [assetId: string]: SupCore.data.base.Asset } = {};
  subscribersByAssetId: { [assetId: string]: AssetSubscriber[] } = {};

  resourcesById: { [resourceId: string]: any} = {};
  subscribersByResourceId: { [assetId: string]: ResourceSubscriber[] } = {};

  _keepEntriesSubscription: boolean;

  constructor(socket: SocketIOClient.Socket, options?: {subEntries: boolean}) {
    this.socket = socket;
    this.socket.on("edit:assets", this._onAssetEdited);
    this.socket.on("trash:assets", this._onAssetTrashed);
    this.socket.on("edit:resources", this._onResourceEdited);

    // Allow keeping an entries subscription alive at all times
    // Used in the scene editor to avoid constantly unsub'ing & resub'ing
    this._keepEntriesSubscription = options != null && options.subEntries;
    if (this._keepEntriesSubscription) this.socket.emit("sub", "entries", null, this._onEntriesReceived);
  }

  subEntries(subscriber: EntriesSubscriber) {
    this.entriesSubscribers.push(subscriber);

    if (this.entriesSubscribers.length === 1 && ! this._keepEntriesSubscription) {
      this.socket.emit("sub", "entries", null, this._onEntriesReceived);
    }
    else if (this.entries != null) subscriber.onEntriesReceived(this.entries);
  }

  unsubEntries(subscriber: EntriesSubscriber) {
    this.entriesSubscribers.splice(this.entriesSubscribers.indexOf(subscriber), 1);

    if (this.entriesSubscribers.length === 0 && ! this._keepEntriesSubscription) {
      this.socket.emit("unsub", "entries");

      this.socket.off("add:entries", this._onEntryAdded);
      this.socket.off("move:entries", this._onEntryMoved);
      this.socket.off("setProperty:entries", this._onSetEntryProperty);
      this.socket.off("trash:entries", this._onEntryTrashed);

      this.entries = null;
    }
  }

  sub(assetId: string, assetType: string, subscriber: AssetSubscriber) {
    console.warn("ProjectClient.sub has been deprecated and will be removed soon. Please use ProjectClient.subAsset instead.");
    this.subAsset(assetId, assetType, subscriber)
  }
  unsub(assetId: string, subscriber: AssetSubscriber) {
    console.warn("ProjectClient.unsub has been deprecated and will be removed soon. Please use ProjectClient.unsubAsset instead.");
    this.unsubAsset(assetId, subscriber);
  }

  subAsset(assetId: string, assetType: string, subscriber: AssetSubscriber) {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) {
      subscribers = this.subscribersByAssetId[assetId] = [];
      this.socket.emit("sub", "assets", assetId, this._onAssetReceived.bind(this, assetId, assetType));
    }
    else {
      let asset = this.assetsById[assetId];
      if (asset != null) subscriber.onAssetReceived(assetId, asset);
    }

    subscribers.push(subscriber);
  }

  unsubAsset(assetId: string, subscriber: AssetSubscriber) {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    let index = subscribers.indexOf(subscriber);
    if (index === -1) return;

    subscribers.splice(index, 1);
    if (subscribers.length === 0) {
      delete this.subscribersByAssetId[assetId];
      this.assetsById[assetId].client_unload();
      delete this.assetsById[assetId];
      this.socket.emit("unsub", "assets", assetId);
    }
  }

  subResource(resourceId: string, subscriber: ResourceSubscriber) {
    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) {
      subscribers = this.subscribersByResourceId[resourceId] = [];
      this.socket.emit("sub", "resources", resourceId, this._onResourceReceived.bind(this, resourceId));
    }
    else {
      let resource = this.resourcesById[resourceId];
      if (resource != null) subscriber.onResourceReceived(resourceId, resource);
    }

    subscribers.push(subscriber);
  }

  unsubResource(resourceId: string, subscriber: ResourceSubscriber) {
    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    let index = subscribers.indexOf(subscriber);
    if (index === -1) return;

    subscribers.splice(index, 1);
    if (subscribers.length === 0) {
      delete this.subscribersByResourceId[resourceId];
      delete this.resourcesById[resourceId];
      this.socket.emit("unsub", "resources", resourceId);
    }
  }

  _onAssetReceived = (assetId: string, assetType: string, err: string, assetData: any) => {
    // FIXME: The asset was probably trashed in the meantime, handle that
    if (err != null) {
      console.warn(`Got an error in ProjectClient._onAssetReceived: ${err}`);
      return;
    }

    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    let asset: SupCore.data.base.Asset = null;
    if (assetData != null) {
      asset = this.assetsById[assetId] = new SupCore.data.assetClasses[assetType](assetId, assetData);
      asset.client_load();
    }

    for (let subscriber of subscribers) { subscriber.onAssetReceived(assetId, asset); }
  }

  _onAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    let asset = this.assetsById[assetId];
    Object.getPrototypeOf(asset)[`client_${command}`].apply(asset, args);

    for (let subscriber of subscribers) { subscriber.onAssetEdited.apply(subscriber, [assetId, command].concat(args)); }
  }

  _onAssetTrashed = (assetId: string) => {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    for (let subscriber of subscribers) { subscriber.onAssetTrashed(assetId); }

    this.assetsById[assetId].client_unload();
    delete this.assetsById[assetId];
    delete this.subscribersByAssetId[assetId];
  }

  _onResourceReceived = (resourceId: string, err: string, resourceData: any) => {
    if (err != null) {
      console.warn(`Got an error in ProjectClient._onResourceReceived: ${err}`);
      return;
    }

    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    let resource: SupCore.data.base.Resource = null;
    if (resourceData != null) resource = this.resourcesById[resourceId] = new SupCore.data.resourceClasses[resourceId](resourceData);

    for (let subscriber of subscribers) { subscriber.onResourceReceived(resourceId, resource); }
  }

  _onResourceEdited = (resourceId: string, command: string, ...args: any[]) => {
    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    let resource = this.resourcesById[resourceId];
    Object.getPrototypeOf(resource)[`client_${command}`].apply(resource, args);

    for (let subscriber of subscribers) { subscriber.onResourceEdited.apply(subscriber, [resourceId, command].concat(args)); }
  }

  _onEntriesReceived = (err: string, entries: any) => {
    this.entries = new SupCore.data.Entries(entries);

    this.socket.on("add:entries", this._onEntryAdded);
    this.socket.on("move:entries", this._onEntryMoved);
    this.socket.on("setProperty:entries", this._onSetEntryProperty);
    this.socket.on("trash:entries", this._onEntryTrashed);

    for (let subscriber of this.entriesSubscribers) { subscriber.onEntriesReceived(this.entries); }
  }

  _onEntryAdded = (entry: any, parentId: string, index: number) => {
    this.entries.client_add(entry, parentId, index);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onEntryAdded(entry, parentId, index);
    }
  }

  _onEntryMoved = (id: string, parentId: string, index: number) => {
    this.entries.client_move(id, parentId, index);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onEntryMoved(id, parentId, index);
    }
  }

  _onSetEntryProperty = (id: string, key: string, value: any) => {
    this.entries.client_setProperty(id, key, value);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onSetEntryProperty(id, key, value);
    }
  }

  _onEntryTrashed = (id: string) => {
    this.entries.client_remove(id);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onEntryTrashed(id);
    }
  }
}
