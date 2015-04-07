///<reference path="typings/node/node.d.ts"/>

declare module SupCore {
  function log(message: string);

  module data {
    function hasDuplicateName(id: string, name: string, siblings: Array<{ id: string; name: string; }>);
    function ensureUniqueName(id: string, name: string, siblings: Array<{ id: string; name: string; }>);

    var assetClasses;
    function registerAssetClass(name: string, assetClass);

    var componentConfigClasses;
    function registerComponentConfigClass(name: string, configClass);

    // This registers a plugin * resource * (see SupCore.data.Resources), not just a resource class, hence the name
    var resourceClasses;
    function registerResource(name: string, resourceClass);

    // Deprecated
    var assetPlugins;
    function addAssetPlugin(name: string, assetClass);

    var componentConfigPlugins;
    function addComponentConfigPlugin(name: string, configClass)

    class Projects extends base.ListById {
      constructor(pub);
      generateProjectId(): string;
    }

    class Manifest extends base.Hash {
      constructor(pub);
    }
    class Internals extends base.Hash {
      constructor(pub);
    }
    class Members extends base.ListById {
      constructor(pub);
    }
    class Diagnostics extends base.ListById {
      constructor(pub);
    }
    class Entries extends base.TreeById {
      diagnosticsByEntryId: { [key: number]: any };
      dependenciesByAssetId: any;

      constructor(pub, nextId?: number);
      add(node, parentId: string, index: number, callback: (err: string, index?: number) => any);
      client_add(node, parentId: string, index: number);
      move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any);
      remove(id: string, callback: (err: string) => any);
      setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any);
      getForStorage();
    }

    class Assets extends base.Dictionary {
      server: any;

      constructor(server: any);
      acquire(id: string, owner, callback: (err: Error) => any);
      _load(id: string);
    }
    class Resources extends base.Dictionary {
      server: any;
      resourceClassesById: any;

      constructor(server, resourceClassesById);
      acquire(id: string, owner, callback: (err: Error, item?: any) => any);
      _load(id);
    }

    class Room extends base.Hash {
      users: RoomUsers;

      constructor(pub);
      load(roomPath: string);
      unload();
      save(roomPath: string, callback: (err: Error) => any);
      join(client: any, callback: (err: string, item?: any, index?: number) => any);
      client_join(item: any, index: number);
      leave(client: any, callback: (err: string, username?: any) => any);
      client_leave(id: string);
      server_appendMessage(client: any, text: string, callback: (err: string, entry?: any) => any);
      client_appendMessage(entry: any);
    }
    class Rooms extends base.Dictionary {
      server: any;

      constructor(server);
      acquire(id: string, owner, callback: (err: Error, item?: any) => any);
      release(id: string, owner, options);
      _load(id: string);

    }
    class RoomUsers extends base.ListById {
      constructor(pub);
    }

    module base {
      function getRuleViolation(value, rule, create: boolean): { message: string; path?: string };
      function formatRuleViolation(violation): string;

      class Hash extends EventEmitter {
        pub: any;
        schema: any;

        constructor(pub, schema);
        setProperty(path: string, value, callback: (err: string, value?: any) => any);
        client_setProperty(path: string, value);
      }

      class ListById extends EventEmitter {
        pub: Array<any>;
        schema: any;
        generateNextId: Function;
        nextId: number;

        byId: any;

        constructor(pub, schema, generateNextId?: Function);
        add(item, index: number, callback: (err: string, index?: number) => any);
        client_add(item, index: number);
        move(id, index, callback: (err: string, index?: number) => any);
        client_move(id, newIndex: number);
        remove(id, callback: (err: string, index?: number) => any);
        client_remove(id);
        setProperty(id, key: string, value, callback: (err: string, value?: any) => any);
        client_setProperty(id, key: string, value);
      }

      class TreeById extends EventEmitter {
        pub: any;
        schema: any;
        nextId: number;

        byId: { [key: string]: any };
        parentNodesById: { [key: string]: any };

        constructor(pub, schema, nextId?: number);
        walk(callback: (node: any, parentNode?: any) => any);
        getPathFromId(id: string): string;
        add(node: any, parentId: string, index: number, callback: (err: string, index?: number) => any);
        client_add(node, parentId: string, index: number);
        move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any);
        client_move(id: string, parentId: string, index: number);
        remove(id: string, callback: (err: string) => any);
        client_remove(id: string);
        setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any);
        client_setProperty(id: string, key: string, value: any);
      }

      class Dictionary extends EventEmitter {
        byId: { [key: string]: any; };
        refCountById: { [key: string]: number; };
        unloadDelaySeconds: number;
        unloadTimeoutsById: any;

        constructor(unloadDelaySeconds: number);
        acquire(id: string, owner, callback: (err: Error, item?: any) => any);
        release(id: string, owner, options?);
        _load(id: string);
        _unload(id: string);
        releaseAll(id: string);
      }

      class Asset extends Hash{
        id: string;
        serverData: any;

        constructor(id, pub, schema, serverData);
        // OVERRIDE: Make sure to call super(callback). Called when creating a new asset
        init(options, callback: Function);

        // OVERRIDE: Called when creating/loading an asset
        setup();

        // OVERRIDE: Called when loading a project
        // Check for any error/warning/info and this.emit 'setDiagnostic' as required
        // Also if the asset depends on others, this.emit 'addDependencies' with a list of entry IDs
        restore();

        // OVERRIDE: Called when destroying an asset
        // Most assets won't need to do anything here but some might want to do some
        // clean up work like making changes to associated resources
        destroy(callback: Function);

        load(assetPath: string);
        unload();
        save(assetPath: string, callback: (err: Error) => any);
        server_setProperty(client, path, value, callback: (err: string, path?: string, value?: any) => any);
      }

      class Resource extends Hash {
        serverData: any;

        constructor(pub, schema, serverData);

        // OVERRIDE: Make sure to call super(callback). Called when creating a new resource
        init(callback: Function);

        // OVERRIDE: Called when creating/loading a resource
        setup();

        load(resourcePath: string);
        unload();
        save(resourcePath: string, callback: (err: Error) => any);
        server_setProperty(client, path, value, callback: (err: string, path?: string, value?: any) => any);
      }

      class ComponentConfig extends Hash{
        constructor(pub, schema);

        // OVERRIDE: Called when loading a scene
        // Check for any error/warning/info and @emit 'setDiagnostic' as required
        // Also if the component depends on assets, @emit 'addDependencies' with a list of entry IDs
        restore();

        // OVERRIDE: Called when destroying a component or its actor
        // If the component depends on assets, @emit 'removeDependencies' with a list of entry IDs
        destroy();

        // OVERRIDE: Called when editing a property
        // You can check for asset dependency changes by overriding this method
        // and calling @emit 'addDependencies' / 'removeDependencies' as needed
        // setProperty(path, value, callback) {}
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
