interface EntriesSubscriber {
  onEntriesReceived(entries: SupCore.Data.Entries): void;
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

  entries: SupCore.Data.Entries;
  entriesSubscribers: EntriesSubscriber[] = [];

  assetsById: { [assetId: string]: SupCore.Data.Base.Asset } = {};
  subscribersByAssetId: { [assetId: string]: AssetSubscriber[] } = {};

  resourcesById: { [resourceId: string]: any} = {};
  subscribersByResourceId: { [assetId: string]: ResourceSubscriber[] } = {};

  private keepEntriesSubscription: boolean;

  constructor(socket: SocketIOClient.Socket, options?: {subEntries: boolean}) {
    this.socket = socket;
    this.socket.on("edit:assets", this.onAssetEdited);
    this.socket.on("trash:assets", this.onAssetTrashed);
    this.socket.on("edit:resources", this.onResourceEdited);

    // Allow keeping an entries subscription alive at all times
    // Used in the scene editor to avoid constantly unsub'ing & resub'ing
    this.keepEntriesSubscription = options != null && options.subEntries;
    if (this.keepEntriesSubscription) this.socket.emit("sub", "entries", null, this.onEntriesReceived);
  }

  subEntries(subscriber: EntriesSubscriber) {
    this.entriesSubscribers.push(subscriber);

    if (this.entriesSubscribers.length === 1 && !this.keepEntriesSubscription) {
      this.socket.emit("sub", "entries", null, this.onEntriesReceived);
    }
    else if (this.entries != null) subscriber.onEntriesReceived(this.entries);
  }

  unsubEntries(subscriber: EntriesSubscriber) {
    this.entriesSubscribers.splice(this.entriesSubscribers.indexOf(subscriber), 1);

    if (this.entriesSubscribers.length === 0 && !this.keepEntriesSubscription) {
      this.socket.emit("unsub", "entries");

      this.socket.off("add:entries", this.onEntryAdded);
      this.socket.off("move:entries", this.onEntryMoved);
      this.socket.off("setProperty:entries", this.onSetEntryProperty);
      this.socket.off("trash:entries", this.onEntryTrashed);

      this.entries = null;
    }
  }

  subAsset(assetId: string, assetType: string, subscriber: AssetSubscriber) {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) {
      subscribers = this.subscribersByAssetId[assetId] = [];
      this.socket.emit("sub", "assets", assetId, this.onAssetReceived.bind(this, assetId, assetType));
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
      if (this.assetsById[assetId] != null) {
        this.assetsById[assetId].client_unload();
        delete this.assetsById[assetId];
        this.socket.emit("unsub", "assets", assetId);
      }
    }
  }

  subResource(resourceId: string, subscriber: ResourceSubscriber) {
    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) {
      subscribers = this.subscribersByResourceId[resourceId] = [];
      this.socket.emit("sub", "resources", resourceId, this.onResourceReceived.bind(this, resourceId));
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
      if (this.resourcesById[resourceId] != null) {
        delete this.resourcesById[resourceId];
        this.socket.emit("unsub", "resources", resourceId);
      }
    }
  }

  private onAssetReceived = (assetId: string, assetType: string, err: string, assetData: any) => {
    // FIXME: The asset was probably trashed in the meantime, handle that
    if (err != null) {
      console.warn(`Got an error in ProjectClient._onAssetReceived: ${err}`);
      return;
    }

    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    let asset: SupCore.Data.Base.Asset = null;
    if (assetData != null) {
      asset = this.assetsById[assetId] = new SupCore.system.data.assetClasses[assetType](assetId, assetData);
      asset.client_load();
    }

    for (let subscriber of subscribers) { subscriber.onAssetReceived(assetId, asset); }
  };

  private onAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    let asset = this.assetsById[assetId];
    Object.getPrototypeOf(asset)[`client_${command}`].apply(asset, args);

    for (let subscriber of subscribers) { subscriber.onAssetEdited.apply(subscriber, [assetId, command].concat(args)); }
  };

  private onAssetTrashed = (assetId: string) => {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    for (let subscriber of subscribers) { subscriber.onAssetTrashed(assetId); }

    this.assetsById[assetId].client_unload();
    delete this.assetsById[assetId];
    delete this.subscribersByAssetId[assetId];
  };

  private onResourceReceived = (resourceId: string, err: string, resourceData: any) => {
    if (err != null) {
      console.warn(`Got an error in ProjectClient._onResourceReceived: ${err}`);
      return;
    }

    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    let resource: SupCore.Data.Base.Resource = null;
    if (resourceData != null) resource = this.resourcesById[resourceId] = new SupCore.system.data.resourceClasses[resourceId](resourceId, resourceData);

    for (let subscriber of subscribers) { subscriber.onResourceReceived(resourceId, resource); }
  };

  private onResourceEdited = (resourceId: string, command: string, ...args: any[]) => {
    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    let resource = this.resourcesById[resourceId];
    Object.getPrototypeOf(resource)[`client_${command}`].apply(resource, args);

    for (let subscriber of subscribers) { subscriber.onResourceEdited.apply(subscriber, [resourceId, command].concat(args)); }
  };

  private onEntriesReceived = (err: string, entries: any) => {
    this.entries = new SupCore.Data.Entries(entries);

    this.socket.on("add:entries", this.onEntryAdded);
    this.socket.on("move:entries", this.onEntryMoved);
    this.socket.on("setProperty:entries", this.onSetEntryProperty);
    this.socket.on("trash:entries", this.onEntryTrashed);

    for (let subscriber of this.entriesSubscribers) { subscriber.onEntriesReceived(this.entries); }
  };

  private onEntryAdded = (entry: any, parentId: string, index: number) => {
    this.entries.client_add(entry, parentId, index);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onEntryAdded(entry, parentId, index);
    }
  };

  private onEntryMoved = (id: string, parentId: string, index: number) => {
    this.entries.client_move(id, parentId, index);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onEntryMoved(id, parentId, index);
    }
  };

  private onSetEntryProperty = (id: string, key: string, value: any) => {
    this.entries.client_setProperty(id, key, value);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onSetEntryProperty(id, key, value);
    }
  };

  private onEntryTrashed = (id: string) => {
    this.entries.client_remove(id);
    for (let subscriber of this.entriesSubscribers) {
      subscriber.onEntryTrashed(id);
    }
  };
}
