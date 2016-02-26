export default class ProjectClient {
  socket: SocketIOClient.Socket;

  entries: SupCore.Data.Entries;
  entriesSubscribers: SupClient.EntriesSubscriber[] = [];

  assetsById: { [assetId: string]: SupCore.Data.Base.Asset } = {};
  subscribersByAssetId: { [assetId: string]: SupClient.AssetSubscriber[] } = {};

  resourcesById: { [resourceId: string]: any} = {};
  subscribersByResourceId: { [assetId: string]: SupClient.ResourceSubscriber[] } = {};

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

  subEntries(subscriber: SupClient.EntriesSubscriber) {
    this.entriesSubscribers.push(subscriber);

    if (this.entriesSubscribers.length === 1 && !this.keepEntriesSubscription) {
      this.socket.emit("sub", "entries", null, this.onEntriesReceived);
    }
    else if (this.entries != null) subscriber.onEntriesReceived(this.entries);
  }

  unsubEntries(subscriber: SupClient.EntriesSubscriber) {
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

  subAsset(assetId: string, assetType: string, subscriber: SupClient.AssetSubscriber) {
    let subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) {
      subscribers = this.subscribersByAssetId[assetId] = [];
      this.socket.emit("sub", "assets", assetId, this.onAssetReceived.bind(this, assetId, assetType));
    }
    else {
      const asset = this.assetsById[assetId];
      if (asset != null && subscriber.onAssetReceived != null) subscriber.onAssetReceived(assetId, asset);
    }

    subscribers.push(subscriber);
  }

  unsubAsset(assetId: string, subscriber: SupClient.AssetSubscriber) {
    const subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    const index = subscribers.indexOf(subscriber);
    if (index === -1) return;

    subscribers.splice(index, 1);
    if (subscribers.length === 0) {
      delete this.subscribersByAssetId[assetId];
      if (this.assetsById[assetId] != null) {
        this.assetsById[assetId].client_unload();
        delete this.assetsById[assetId];
      }
      this.socket.emit("unsub", "assets", assetId);
    }
  }

  editAsset(assetId: string, command: string, ...args: any[]) {
    let callback: Function;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    args.push((err: string, id: string) => {
      if (err != null) {
        /* tslint:disable:no-unused-expression */
        new SupClient.Dialogs.InfoDialog(err);
        /* tslint:enable:no-unused-expression */
        return;
      }
      if (callback != null) callback(id);
    });

    this.socket.emit("edit:assets", assetId, command, ...args);
  }

  editAssetNoErrorHandling(assetId: string, command: string, ...args: any[]) {
    this.socket.emit("edit:assets", assetId, command, ...args);
  }

  subResource(resourceId: string, subscriber: SupClient.ResourceSubscriber) {
    let subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) {
      subscribers = this.subscribersByResourceId[resourceId] = [];
      this.socket.emit("sub", "resources", resourceId, this.onResourceReceived.bind(this, resourceId));
    }
    else {
      const resource = this.resourcesById[resourceId];
      if (resource != null && subscriber.onResourceReceived != null) subscriber.onResourceReceived(resourceId, resource);
    }

    subscribers.push(subscriber);
  }

  unsubResource(resourceId: string, subscriber: SupClient.ResourceSubscriber) {
    const subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    const index = subscribers.indexOf(subscriber);
    if (index === -1) return;

    subscribers.splice(index, 1);
    if (subscribers.length === 0) {
      delete this.subscribersByResourceId[resourceId];
      if (this.resourcesById[resourceId] != null) {
        delete this.resourcesById[resourceId];
      }
      this.socket.emit("unsub", "resources", resourceId);
    }
  }

  editResource(resourceId: string, command: string, ...args: any[]) {
    let callback: Function;
    if (typeof args[args.length - 1] === "function") callback = args.pop();

    args.push((err: string, id: string) => {
      if (err != null) {
        /* tslint:disable:no-unused-expression */
        new SupClient.Dialogs.InfoDialog(err);
        /* tslint:enable:no-unused-expression */
        return;
      }
      if (callback != null) callback(id);
    });

    this.socket.emit("edit:resources", resourceId, command, ...args);
  }


  private onAssetReceived = (assetId: string, assetType: string, err: string, assetData: any) => {
    // FIXME: The asset was probably trashed in the meantime, handle that
    if (err != null) {
      console.warn(`Got an error in ProjectClient.onAssetReceived: ${err}`);
      return;
    }

    const subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    let asset: SupCore.Data.Base.Asset = null;
    if (assetData != null) {
      asset = this.assetsById[assetId] = new SupCore.system.data.assetClasses[assetType](assetId, assetData);
      asset.client_load();
    }

    for (const subscriber of subscribers) {
      if (subscriber.onAssetReceived != null) subscriber.onAssetReceived(assetId, asset);
    }
  };

  private onAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    const subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    const asset = this.assetsById[assetId];
    Object.getPrototypeOf(asset)[`client_${command}`].apply(asset, args);

    for (const subscriber of subscribers) {
      if (subscriber.onAssetEdited != null) subscriber.onAssetEdited(assetId, command, ...args);
    }
  };

  private onAssetTrashed = (assetId: string) => {
    const subscribers = this.subscribersByAssetId[assetId];
    if (subscribers == null) return;

    for (const subscriber of subscribers) {
      if (subscriber.onAssetTrashed != null) subscriber.onAssetTrashed(assetId);
    }

    this.assetsById[assetId].client_unload();
    delete this.assetsById[assetId];
    delete this.subscribersByAssetId[assetId];
  };

  private onResourceReceived = (resourceId: string, err: string, resourceData: any) => {
    if (err != null) {
      console.warn(`Got an error in ProjectClient.onResourceReceived: ${err}`);
      return;
    }

    const subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    let resource: SupCore.Data.Base.Resource = null;
    if (resourceData != null) resource = this.resourcesById[resourceId] = new SupCore.system.data.resourceClasses[resourceId](resourceId, resourceData);

    for (const subscriber of subscribers) {
      if (subscriber.onResourceReceived != null) subscriber.onResourceReceived(resourceId, resource);
    }
  };

  private onResourceEdited = (resourceId: string, command: string, ...args: any[]) => {
    const subscribers = this.subscribersByResourceId[resourceId];
    if (subscribers == null) return;

    const resource = this.resourcesById[resourceId];
    Object.getPrototypeOf(resource)[`client_${command}`].apply(resource, args);

    for (const subscriber of subscribers) {
      if (subscriber.onResourceEdited != null) subscriber.onResourceEdited(resourceId, command, ...args);
    }
  };

  private onEntriesReceived = (err: string, entries: any) => {
    this.entries = new SupCore.Data.Entries(entries);

    this.socket.on("add:entries", this.onEntryAdded);
    this.socket.on("move:entries", this.onEntryMoved);
    this.socket.on("setProperty:entries", this.onSetEntryProperty);
    this.socket.on("trash:entries", this.onEntryTrashed);

    for (const subscriber of this.entriesSubscribers) {
      if (subscriber.onEntriesReceived != null) subscriber.onEntriesReceived(this.entries);
    }
  };

  private onEntryAdded = (entry: any, parentId: string, index: number) => {
    this.entries.client_add(entry, parentId, index);
    for (const subscriber of this.entriesSubscribers) {
      if (subscriber.onEntryAdded != null) subscriber.onEntryAdded(entry, parentId, index);
    }
  };

  private onEntryMoved = (id: string, parentId: string, index: number) => {
    this.entries.client_move(id, parentId, index);
    for (const subscriber of this.entriesSubscribers) {
      if (subscriber.onEntryMoved != null) subscriber.onEntryMoved(id, parentId, index);
    }
  };

  private onSetEntryProperty = (id: string, key: string, value: any) => {
    this.entries.client_setProperty(id, key, value);
    for (const subscriber of this.entriesSubscribers) {
      if (subscriber.onSetEntryProperty != null) subscriber.onSetEntryProperty(id, key, value);
    }
  };

  private onEntryTrashed = (id: string) => {
    this.entries.client_remove(id);
    for (const subscriber of this.entriesSubscribers) {
      if (subscriber.onEntryTrashed != null) subscriber.onEntryTrashed(id);
    }
  };
}
