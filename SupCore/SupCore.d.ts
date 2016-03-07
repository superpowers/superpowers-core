/// <reference path="../typings/tsd.d.ts" />
/// <reference path="./ProjectServer.d.ts" />

declare namespace SupCore {
  export function log(message: string): void;

  export class LocalizedError {
    key: string;
    variables: { [key: string]: string; };

    constructor(key: string, variables: { [key: string]: string; });
  }

  namespace Data {
    export function hasDuplicateName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): boolean;
    export function ensureUniqueName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): string;

    interface AssetClass { new(id: string, pub: any, server?: ProjectServer): Base.Asset; }
    interface ResourceClass { new(id: string, pub: any, server?: ProjectServer): Base.Resource; }
    type Schema = { [key: string]: Base.Rule };

    class Projects extends Base.ListById {
      static sort(a: ProjectManifestPub, b: ProjectManifestPub): number;

      pub: ProjectManifestPub[];
      byId: { [id: string]: ProjectManifestPub; };

      constructor(pub: ProjectManifestPub[]);
      generateProjectId(): string;
    }

    interface ProjectManifestPub {
      id: string;
      name: string;
      description: string;
      systemId: string;
      formatVersion: number;
    }
    class ProjectManifest extends Base.Hash {
      static currentFormatVersion: number;

      pub: ProjectManifestPub;
      migratedFromFormatVersion: number;

      constructor(pub: ProjectManifestPub);
    }

    interface BadgeItem {
      id: string;
      type: string;
      data: any;
    }

    class Badges extends Base.ListById {
      constructor(pub: BadgeItem[]);
    }

    interface EntryNode {
      id: string;
      name: string;
      children?: EntryNode[];
      [name: string]: any;

      type?: string;
      badges?: BadgeItem[];
      dependentAssetIds?: any[];
    }
    class Entries extends Base.TreeById {
      pub: EntryNode[];
      byId: { [id: string]: EntryNode };
      parentNodesById: { [id: string]: EntryNode };

      badgesByEntryId: { [key: string]: Badges };
      dependenciesByAssetId: any;

      constructor(pub: EntryNode[], server?: ProjectServer);
      walk(callback: (node: EntryNode, parentNode?: EntryNode) => any): void;
      add(node: EntryNode, parentId: string, index: number, callback: (err: string, index?: number) => any): void;
      client_add(node: EntryNode, parentId: string, index: number): void;
      move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any): void;
      remove(id: string, callback: (err: string) => any): void;
      setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any): void;
      getForStorage(): EntryNode[];
      getStoragePathFromId(id: string): string;
    }

    class Assets extends Base.Dictionary {
      server: ProjectServer;

      constructor(server: ProjectServer);
      // _load(id: string): void;
    }
    class Resources extends Base.Dictionary {
      server: ProjectServer;
      resourceClassesById: ProjectServer;

      constructor(server: ProjectServer);
      // _load(id: string): void;
    }

    class Room extends Base.Hash {
      users: RoomUsers;

      constructor(pub: any);
      load(roomPath: string): void;
      unload(): void;
      save(roomPath: string, callback: (err: Error) => any): void;
      join(client: any, callback: (err: string, item?: any, index?: number) => any): void;
      client_join(item: any, index: number): void;
      leave(client: any, callback: (err: string, username?: any) => any): void;
      client_leave(id: string): void;
      server_appendMessage(client: any, text: string, callback: (err: string, entry?: any) => any): void;
      client_appendMessage(entry: any): void;
    }
    class Rooms extends Base.Dictionary {
      server: ProjectServer;

      constructor(server: ProjectServer);
      // _load(id: string): void;

    }
    class RoomUsers extends Base.ListById {
      constructor(pub: any[]);
    }

    namespace Base {
      interface Rule {
        mutable?: boolean;
        type: string;

        // Number
        min?: number;
        minExcluded?: number;
        max?: number;
        maxExcluded?: number;

        // String
        length?: number;
        minLength?: number;
        maxLength?: number;

        // Enum or Array
        items?: string[] | Rule;

        // Hash
        keys?: { length?: number; minLength?: number; maxLength?: number; };
        values?: Rule;
        properties?: { [key: string]: Rule };
      }
      interface Violation {
        message: string; path?: string;
      }

      export function getRuleViolation(value: any, rule: Rule, create: boolean): Violation;
      export function formatRuleViolation(violation: Violation): string;

      class Hash extends EventEmitter {
        pub: any;
        schema: Schema;

        constructor(pub: any, schema: Schema);
        setProperty(path: string, value: number|string|boolean, callback: (err: string, value?: any) => any): void;
        client_setProperty(path: string, value: number|string|boolean): void;
      }

      class ListById extends EventEmitter {
        pub: any[];
        schema: Schema;
        generateNextId: Function;
        nextId: number;

        byId: any;

        constructor(pub: any[], schema: Schema, generateNextId?: Function);
        add(item: any, index: number, callback: (err: string, index?: number) => any): void;
        client_add(item: any, index: number): void;
        move(id: string, index: number, callback: (err: string, index?: number) => any): void;
        client_move(id: string, newIndex: number): void;
        remove(id: string, callback: (err: string, index?: number) => any): void;
        client_remove(id: string): void;
        setProperty(id: string, key: string, value: number|string|boolean, callback: (err: string, value?: any) => any): void;
        client_setProperty(id: string, key: string, value: number|string|boolean): void;
      }

      interface TreeNode {
        id: string;
        name: string;
        children?: TreeNode[];
        [name: string]: any;
      }
      class TreeById extends EventEmitter {
        pub: TreeNode[];
        schema: Schema;
        nextId: number;

        byId: { [key: string]: any };
        parentNodesById: { [key: string]: any };

        constructor(pub: TreeNode[], schema: Schema, nextId?: number);
        walk(callback: (node: TreeNode, parentNode?: TreeNode) => any): void;
        walkNode(node: TreeNode, parentNode: TreeNode, callback: (node: TreeNode, parentNode?: TreeNode) => any): void;
        getPathFromId(id: string): string;
        add(node: TreeNode, parentId: string, index: number, callback: (err: string, index?: number) => any): void;
        client_add(node: TreeNode, parentId: string, index: number): void;
        move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any): void;
        client_move(id: string, parentId: string, index: number): void;
        remove(id: string, callback: (err: string) => any): void;
        client_remove(id: string): void;
        setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any): void;
        client_setProperty(id: string, key: string, value: any): void;
      }

      class Dictionary extends EventEmitter {
        byId: { [key: string]: any; };
        refCountById: { [key: string]: number; };
        unloadDelaySeconds: number;
        unloadTimeoutsById: { [id: string]: number };

        constructor(unloadDelaySeconds: number);
        acquire(id: string, owner: any, callback: (err: Error, item: any) => any): void;
        release(id: string, owner: any, options?: { skipUnloadDelay: boolean }): void;
        // _load(id: string): void;
        // _unload(id: string): void;
        releaseAll(id: string): void;
      }

      class Asset extends Hash {
        id: string;
        server: ProjectServer;

        constructor(id: string, pub: any, schema: Schema, server: ProjectServer);

        // OVERRIDE: Make sure to call super.init(callback). Called when creating a new asset
        init(options: any, callback: Function): void;

        // OVERRIDE: Called when creating/loading an asset
        setup(): void;

        // OVERRIDE: Called when loading a project
        // Check for any error/warning/info and this.emit("setBadge", ...) as required
        // Also if the asset depends on others, this.emit("addDependencies", ...) with a list of entry IDs
        restore(): void;

        // OVERRIDE: Called when destroying an asset
        // Most assets won't need to do anything here but some might want to do some
        // clean up work like making changes to associated resources
        destroy(callback: Function): void;

        load(assetPath: string): void;
        _onLoaded(assetPath: string, pub: any): void;
        unload(): void;
        migrate(assetPath: string, pub: any, callback: (hasMigrated: boolean) => void): void;

        client_load(): void;
        client_unload(): void;

        save(assetPath: string, callback: (err: Error) => any): void;
        publish(buildPath: string, callback: (err: Error) => any): void;

        server_setProperty(client: RemoteClient, path: string, value: any, callback: (err: string, path?: string, value?: any) => any): void;
      }

      class Resource extends Hash {
        server: ProjectServer;

        constructor(id: string, pub: any, schema: Schema, server: ProjectServer);

        // OVERRIDE: Make sure to call super(callback). Called when creating a new resource
        init(callback: Function): void;

        // OVERRIDE: Called when creating/loading a resource
        setup(): void;

        // OVERRIDE: Called when loading a project
        // Check for any error/warning/info and this.emit("setAssetBadge", ...) as required
        restore(): void;

        load(resourcePath: string): void;
        _onLoaded(resourcePath: string, pub: any): void;
        unload(): void;
        migrate(resourcePath: string, pub: any, callback: (hasMigrated: boolean) => void): void;

        save(resourcePath: string, callback: (err: Error) => any): void;
        publish(buildPath: string, callback: (err: Error) => any): void;

        server_setProperty(client: RemoteClient, path: string, value: number|string|boolean, callback: (err: string, path?: string, value?: any) => any): void;
      }
    }
  }

  interface RemoteClient {
    id: string;
  }

  interface PluginsInfo {
    list: string[];
    paths: {
      editors: { [assetType: string]: string; };
      tools: { [name: string]: string; };
    };
    publishedBundles: string[];
  }

  interface SystemsInfo {
    list: string[];
  }

  class SystemData {
    assetClasses: { [assetName: string]: SupCore.Data.AssetClass; };
    resourceClasses: { [resourceId: string]: SupCore.Data.ResourceClass };

    registerAssetClass(name: string, assetClass: SupCore.Data.AssetClass): void;
    // Register a plugin *resource* (see SupCore.Data.Resources), not just a resource class, hence the name
    registerResource(id: string, resourceClass: SupCore.Data.ResourceClass): void;
  }

  class System {
    id: string;
    folderName: string;
    data: SystemData;

    constructor(id: string, folderName: string);
    requireForAllPlugins(filePath: string): void;
    registerPlugin<T>(contextName: string, pluginName: string, plugin: T): void;
    getPlugins<T>(contextName: string): { [pluginName: string]: T };
  }

  // All loaded systems (server-side only)
  export const systems: { [system: string]: System };
  export const systemsPath: string;
  // The currently active system
  export let system: System;

  class EventEmitter implements NodeJS.EventEmitter {
    addListener(event: string, listener: Function): EventEmitter;
    on(event: string, listener: Function): EventEmitter;
    once(event: string, listener: Function): EventEmitter;
    removeListener(event: string, listener: Function): EventEmitter;
    removeAllListeners(event?: string): EventEmitter;
    setMaxListeners(n: number): EventEmitter;
    getMaxListeners(): number;
    listeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    listenerCount(type: string): number;
  }
}
