import * as fs from "fs";
import * as path from "path";

import * as SupData from "./index";

export default class Entries extends SupData.Base.TreeById {
  static schema: SupCore.Data.Schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    type: { type: "string?" },
    badges: { type: "array?" },
    dependentAssetIds: { type: "array", items: { type: "string" } },
    revisions: {
      type: "array",
      items: {
        type: "hash",
        properties: {
          id: { type: "string" },
          name: { type: "string" }
        }
      }
    },
  };

  pub: SupCore.Data.EntryNode[];
  byId: { [id: string]: SupCore.Data.EntryNode };
  parentNodesById: { [id: string]: SupCore.Data.EntryNode };

  badgesByEntryId: { [key: string]: SupData.Badges } = {};
  dependenciesByAssetId: any = {};
  revisionsByEntryId: { [ id: string ]: { [ revisionId: string]: string; } } = {};

  constructor(pub: SupCore.Data.EntryNode[], nextEntryId: number, public server?: ProjectServer) {
    super(pub, Entries.schema, nextEntryId);

    this.walk((node: SupCore.Data.EntryNode, parentNode: SupCore.Data.EntryNode) => {
      if (node.type == null) return;

      if (node.badges == null) node.badges = [];
      this.badgesByEntryId[node.id] = new SupData.Badges(node.badges);
      if (node.dependentAssetIds == null) node.dependentAssetIds = [];

      if (this.server != null) {
        node.revisions = [];

        let revisionList: string[] = [];
        try { revisionList = fs.readdirSync(path.join(this.server.projectPath, `assetRevisions/${node.id}`)); }
        catch (e) { /* Ignore if the entry doesn't have any revision */ }

        this.revisionsByEntryId[node.id] = {};
        for (const fullRevisionPath of revisionList) {
          const separatorIndex = fullRevisionPath.indexOf("-");
          const revisionId = fullRevisionPath.slice(0, separatorIndex);
          const revisionName = fullRevisionPath.slice(separatorIndex + 1);
          node.revisions.push({ id: revisionId, name: revisionName });
          this.revisionsByEntryId[node.id][revisionId] = revisionName;
        }
      }
    });
  }

  add(node: SupCore.Data.EntryNode, parentId: string, index: number, callback: (err: string, index?: number) => any) {
    const assetClass = this.server.system.data.assetClasses[node.type];
    if (node.type != null && assetClass == null) { callback("Invalid asset type"); return; }

    super.add(node, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      let siblings = this.pub;
      if (parentId != null) siblings = (this.byId[parentId] != null) ? this.byId[parentId].children : null;
      node.name = SupData.ensureUniqueName(node.id, node.name, siblings);

      if (node.type != null) {
        const badges = new SupData.Badges(node.badges);
        this.badgesByEntryId[node.id] = badges;
        node.badges = badges.pub;

        node.revisions = [];
        this.revisionsByEntryId[node.id] = {};
      }
      else node.children = [];

      callback(null, actualIndex);
    });
  }

  client_add(node: SupCore.Data.EntryNode, parentId: string, index: number) {
    super.client_add(node, parentId, index);
    this.badgesByEntryId[node.id] = new SupData.Badges(node.badges);
  }

  move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any) {
    const node = this.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`); return; }

    // Check that the requested parent is indeed a folder
    let siblings = this.pub;
    if (parentId != null) siblings = (this.byId[parentId] != null) ? this.byId[parentId].children : null;
    if (siblings == null) { callback(`Invalid parent node id: ${parentId}`); return; }

    if (SupData.hasDuplicateName(node.id, node.name, siblings)) { callback("There's already an entry with this name in this folder"); return; }

    super.move(id, parentId, index, callback);
  }

  remove(id: string, callback: (err: string) => any) {
    const node = this.byId[id] as SupCore.Data.EntryNode;
    if (node == null) { callback(`Invalid node id: ${id}`); return; }
    if (node.type == null && node.children.length !== 0) { callback("The folder must be empty"); return; }

    delete this.badgesByEntryId[id];
    delete this.revisionsByEntryId[id];

    super.remove(id, callback);
  }

  setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any) {
    if (key === "name") {
      if (typeof (value) !== "string") { callback("Invalid value"); return; }
      value = value.trim();

      const siblings = (this.parentNodesById[id] != null) ? this.parentNodesById[id].children : this.pub;
      if (SupData.hasDuplicateName(id, value, siblings)) { callback("There's already an entry with this name in this folder"); return; }
    }

    super.setProperty(id, key, value, callback);
  }

  save(id: string, revisionName: string, callback: (err: string, revisionId?: string) => void) {
    const entry = this.byId[id];
    if (entry == null || entry.type == null) { callback("No such asset"); return; }

    const revisionId = Date.now().toString();
    entry.revisions.push({ id: revisionId, name: revisionName });
    this.revisionsByEntryId[id][revisionId] = revisionName;

    callback(null, revisionId);
  }

  client_save(id: string, revisionId: string, revisionName: string) {
    const entry = this.byId[id];
    entry.revisions.push({ id: revisionId, name: revisionName });
  }

  getForStorage() {
    const entries: SupCore.Data.EntryNode[] = [];
    const entriesById: {[id: string]: SupCore.Data.EntryNode} = {};

    this.walk((entry: SupCore.Data.EntryNode, parentEntry: SupCore.Data.EntryNode) => {
      const savedEntry: SupCore.Data.EntryNode = { id: entry.id, name: entry.name, type: entry.type };
      if (entry.children != null) savedEntry.children = [];
      entriesById[savedEntry.id] = savedEntry;

      if (parentEntry == null) entries.push(savedEntry);
      else entriesById[parentEntry.id].children.push(savedEntry);
    });
    return entries;
  }

  getStoragePathFromId(id: string) {
    let fullStoragePath = `${this.byId[id].name} (${id})`;
    while (this.parentNodesById[id] != null) {
      const parentNode = this.parentNodesById[id];
      fullStoragePath = `${this.byId[parentNode.id].name} (${parentNode.id})/${fullStoragePath}`;
      id = parentNode.id;
    }
    return fullStoragePath;
  }
}
