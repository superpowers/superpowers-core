///<reference path="../typings/tsd.d.ts"/>

declare module SupCore {
  function log(message: string): void;

  module data {
    function hasDuplicateName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): boolean;
    function ensureUniqueName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): string;

    interface AssetClass { new(id: string, pub: any, serverData?: any): base.Asset; }
    var assetClasses: {[assetName: string]: AssetClass};
    function registerAssetClass(name: string, assetClass: AssetClass): void;

    interface ComponentConfigClass { new(pub: any): base.ComponentConfig; }
    var componentConfigClasses: {[componentConfigName: string]: ComponentConfigClass};
    function registerComponentConfigClass(name: string, configClass: ComponentConfigClass): void;

    // This registers a plugin * resource * (see SupCore.data.Resources), not just a resource class, hence the name
    interface ResourceClass { new(pub: any, serverData?: any): base.Resource; }
    var resourceClasses: {[resourceName: string]: ResourceClass};
    function registerResource(name: string, resourceClass: ResourceClass): void;

    // Deprecated
    var assetPlugins: {[assetName: string]: AssetClass};
    function addAssetPlugin(name: string, assetClass: AssetClass): void;
    var componentConfigPlugins: {[componentConfigName: string]: ComponentConfigClass};
    function addComponentConfigPlugin(name: string, configClass: ComponentConfigClass): void;

    class Projects extends base.ListById {
      constructor(pub: any[]);
      generateProjectId(): string;
    }

    class Manifest extends base.Hash {
      constructor(pub: any);
    }
    class Internals extends base.Hash {
      constructor(pub: any);
    }
    class Members extends base.ListById {
      constructor(pub: any[]);
    }
    class Diagnostics extends base.ListById {
      constructor(pub: any[]);
    }

    interface EntryNode {
      id: string;
      name: string;
      children?: EntryNode[];
      [name: string]: any;

      type?: string;
      diagnostics?: string[];
      dependentAssetIds?: any[];
    }
    class Entries extends base.TreeById {
      diagnosticsByEntryId: { [key: string]: Diagnostics };
      dependenciesByAssetId: any;

      constructor(pub: any, nextId?: number);
      add(node: EntryNode, parentId: string, index: number, callback: (err: string, index?: number) => any): void;
      client_add(node: EntryNode, parentId: string, index: number): void;
      move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any): void;
      remove(id: string, callback: (err: string) => any): void;
      setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any): void;
      getForStorage(): EntryNode[];
    }

    class Assets extends base.Dictionary {
      server: any;

      constructor(server: any);
      acquire(id: string, owner: any, callback: (err: Error) => any): void;
      _load(id: string): void;
    }
    class Resources extends base.Dictionary {
      server: any;
      resourceClassesById: any;

      constructor(server: any);
      acquire(id: string, owner: any, callback: (err: Error, item?: any) => any): void;
      _load(id: string): void;
    }

    class Room extends base.Hash {
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
    class Rooms extends base.Dictionary {
      server: any;

      constructor(server: any);
      acquire(id: string, owner: any, callback: (err: Error, item?: any) => any): void;
      release(id: string, owner: any, options: any): void;
      _load(id: string): void;

    }
    class RoomUsers extends base.ListById {
      constructor(pub: any[]);
    }

    module base {
      interface Rule {
        mutable: boolean;
        type: string;

        // Number
        min?: number;
        max?: number;

        // String
        length?: string;
        minLength?: string;
        maxLength?: string;

        // Enum or Array
        items?: Rule|string[];

        // Hash
        keys?: {length?: string; minLength?: string; maxLength?: string;}
        values?: Rule;
        properties?: {[key: string]: Rule};
      }
      interface Violation {
        message: string; path?: string;
      }

      function getRuleViolation(value: any, rule: Rule, create: boolean): Violation;
      function formatRuleViolation(violation: Violation): string;

      class Hash extends EventEmitter {
        pub: any;
        schema: any;

        constructor(pub: any, schema: any);
        setProperty(path: string, value: number|string|boolean, callback: (err: string, value?: any) => any): void;
        client_setProperty(path: string, value: number|string|boolean): void;
      }

      class ListById extends EventEmitter {
        pub: any[];
        schema: any;
        generateNextId: Function;
        nextId: number;

        byId: any;

        constructor(pub: any[], schema: any, generateNextId?: Function);
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
        schema: any;
        nextId: number;

        byId: { [key: string]: any };
        parentNodesById: { [key: string]: any };

        constructor(pub: TreeNode[], schema: any, nextId?: number);
        walk(callback: (node: TreeNode, parentNode?: any) => any): void;
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
        unloadTimeoutsById: {[id: string]: number};

        constructor(unloadDelaySeconds: number);
        acquire(id: string, owner: any, callback: (err: Error, item?: any) => any): void;
        release(id: string, owner: any, options?: {skipUnloadDelay: boolean}): void;
        _load(id: string): void;
        _unload(id: string): void;
        releaseAll(id: string): void;
      }

      class Asset extends Hash{
        id: string;
        serverData: any;

        constructor(id: string, pub: any, schema: any, serverData: any);
        // OVERRIDE: Make sure to call super(callback). Called when creating a new asset
        init(options: any, callback: Function): void;

        // OVERRIDE: Called when creating/loading an asset
        setup(): void;

        // OVERRIDE: Called when loading a project
        // Check for any error/warning/info and this.emit 'setDiagnostic' as required
        // Also if the asset depends on others, this.emit 'addDependencies' with a list of entry IDs
        restore(): void;

        // OVERRIDE: Called when destroying an asset
        // Most assets won't need to do anything here but some might want to do some
        // clean up work like making changes to associated resources
        destroy(callback: Function): void;

        load(assetPath: string): void;
        unload(): void;
        save(assetPath: string, callback: (err: Error) => any): void;
        server_setProperty(client: any, path: string, value: any, callback: (err: string, path?: string, value?: any) => any): void;
      }

      class Resource extends Hash {
        serverData: any;

        constructor(pub: any, schema: any, serverData: any);

        // OVERRIDE: Make sure to call super(callback). Called when creating a new resource
        init(callback: Function): void;

        // OVERRIDE: Called when creating/loading a resource
        setup(): void;

        load(resourcePath: string): void;
        unload(): void;
        save(resourcePath: string, callback: (err: Error) => any): void;
        server_setProperty(client: any, path: string, value: number|string|boolean, callback: (err: string, path?: string, value?: any) => any): void;
      }

      class ComponentConfig extends Hash{
        constructor(pub: any, schema: any);

        // OVERRIDE: Called when loading a scene
        // Check for any error/warning/info and @emit 'setDiagnostic' as required
        // Also if the component depends on assets, @emit 'addDependencies' with a list of entry IDs
        restore(): void;

        // OVERRIDE: Called when destroying a component or its actor
        // If the component depends on assets, @emit 'removeDependencies' with a list of entry IDs
        destroy(): void;

        // OVERRIDE: Called when editing a property
        // You can check for asset dependency changes by overriding this method
        // and calling @emit 'addDependencies' / 'removeDependencies' as needed
        // setProperty(path, value, callback) {}

        server_setProperty(client: any, path: string, value: number|string|boolean, callback: (err: string, path?: string, value?: any) => any): void;
      }
    }
  }

  class EventEmitter implements NodeJS.EventEmitter {
    static listenerCount(emitter: EventEmitter, event: string): number;

    addListener(event: string, listener: Function): EventEmitter;
    on(event: string, listener: Function): EventEmitter;
    once(event: string, listener: Function): EventEmitter;
    removeListener(event: string, listener: Function): EventEmitter;
    removeAllListeners(event?: string): EventEmitter;
    setMaxListeners(n: number): void;
    listeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
  }
}
