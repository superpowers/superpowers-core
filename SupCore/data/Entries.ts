import * as SupData from "./index";

interface EntryNode {
  id: string;
  name: string;
  children?: EntryNode[];
  [name: string]: any;

  type?: string;
  diagnostics?: string[];
  dependentAssetIds?: any[];
}

export default class Entries extends SupData.base.TreeById {
  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    type: { type: "string?" },
    diagnostics: { type: "array?" },
    dependentAssetIds: { type: "array", items: { type: "string" } }
  }

  diagnosticsByEntryId: { [key: string]: SupData.Diagnostics } = {};
  dependenciesByAssetId: any = {};

  constructor(pub: any, nextId?: number) {
    super(pub, Entries.schema, nextId);

    this.walk((node: EntryNode, parentNode: EntryNode) => {
      if (node.type == null) return;

      if (node.diagnostics == null) node.diagnostics = [];
      this.diagnosticsByEntryId[node.id] = new SupData.Diagnostics(node.diagnostics);
      if (node.dependentAssetIds == null) node.dependentAssetIds = [];
    });
  }

  add(node: EntryNode, parentId: string, index: number, callback: (err: string, index?: number) => any) {
    if (node.type != null && SupData.assetClasses[node.type] == null) { callback("Invalid asset type"); return; }

    super.add(node, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      let siblings = this.pub;
      if (parentId != null) siblings = (this.byId[parentId] != null) ? this.byId[parentId].children : null;
      node.name = SupData.ensureUniqueName(node.id, node.name, siblings);

      if (node.type != null) {
        let diagnostics = new SupData.Diagnostics(node.diagnostics)
        this.diagnosticsByEntryId[node.id] = diagnostics;
        node.diagnostics = diagnostics.pub;
      }
      else node.children = [];

      callback(null, actualIndex);
    });
  }

  client_add(node: EntryNode, parentId: string, index: number) {
    super.client_add(node, parentId, index);
    this.diagnosticsByEntryId[node.id] = new SupData.Diagnostics(node.diagnostics);
  }

  move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any) {
    let node = this.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`); return; }

    // Check that the requested parent is indeed a folder
    let siblings = this.pub;
    if (parentId != null) siblings = (this.byId[parentId] != null) ? this.byId[parentId].children : null;
    if (siblings == null) { callback(`Invalid parent node id: ${parentId}`); return; }

    if (SupData.hasDuplicateName(node.id, node.name, siblings)) { callback("There's already an entry with this name in this folder"); return; }

    super.move(id, parentId, index, callback);
  }

  remove(id: string, callback: (err: string) => any) {
    let node = <EntryNode>this.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`); return; }
    if (node.type == null && node.children.length != 0) { callback("The folder must be empty"); return; }

    super.remove(id, callback);
  }


  setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any) {
    if (key == "name") {
      if (typeof (value) != "string") { callback("Invalid value"); return; }
      value = value.trim();

      let siblings = (this.parentNodesById[id] != null) ? this.parentNodesById[id].children : this.pub;
      if (SupData.hasDuplicateName(id, value, siblings)) { callback("There's already an entry with this name in this folder"); return; }
    }

    super.setProperty(id, key, value, callback);
  }

  getForStorage() {
    let entries: EntryNode[] = [];
    let entriesById: {[id: string]: EntryNode} = {};

    this.walk((entry: EntryNode, parentEntry: EntryNode) => {
      let savedEntry: EntryNode = { id: entry.id, name: entry.name, type: entry.type };
      if (entry.children != null) savedEntry.children = [];
      entriesById[savedEntry.id] = savedEntry;

      if (parentEntry == null) entries.push(savedEntry);
      else entriesById[parentEntry.id].children.push(savedEntry);
    });
    return entries;
  }
}
