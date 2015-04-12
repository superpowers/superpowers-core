import base = require("./index");
import events = require("events");

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  [name: string]: any;
}

class TreeById extends events.EventEmitter {
  pub: TreeNode[];
  schema: any;
  nextId: number;

  byId: { [key: string]: TreeNode };
  parentNodesById: { [key: string]: TreeNode };

  constructor(pub: any, schema: any, nextId?: number) {
    super();
    this.pub = pub;
    this.schema = schema;
    this.nextId = nextId;

    this.byId = {};
    this.parentNodesById = {};

    var maxNodeId = -1;
    this.walk( (node, parentNode) => {
      // TODO: Remove this cast at some point, legacy stuff from Superpowers 0.4
      if(typeof node.id == 'number') node.id = node.id.toString();

      maxNodeId = Math.max(maxNodeId, parseInt(node.id));
      this.byId[node.id] = node;
      this.parentNodesById[node.id] = parentNode;
    });

    if (this.nextId == null) this.nextId = maxNodeId + 1;
  }

  walk(callback: (node: TreeNode, parentNode?: TreeNode) => any) {
    var walkRecurse = (node: TreeNode, parentNode?: TreeNode) => {
      callback(node, parentNode);

      if (node.children != null) {
        node.children.forEach((child) => { walkRecurse(child, node); });
      }
    };

    this.pub.forEach((node) => { walkRecurse(node); });
  }

  getPathFromId(id: string): string {
    var name = this.byId[id].name;
    var parent = this.parentNodesById[id];
    while(true) {
      if (parent == null) break;
      name = `${parent.name}/${name}`;
      parent = this.parentNodesById[parent.id];
    }

    return name;
  }

  add(node: TreeNode, parentId: string, index: number, callback: (err: string, index?: number) => any) {
    if (node.id != null && this.schema.id == null) { callback("Found unexpected id key"); return; }

    var siblings = this.pub;
    if (parentId != null) siblings = (this.byId[parentId] != null) ? this.byId[parentId].children : null;
    if (siblings == null) { callback(`Invalid parent id: ${parentId}`); return; }

    var missingKeys = Object.keys(this.schema);
    for (var key in node) {
      var value = node[key];
      var rule = this.schema[key];
      if (rule == null) { callback(`Invalid key: ${key}`); return; }
      var violation = base.getRuleViolation(value, rule, true);
      if (violation != null) { callback(`Invalid value: ${base.formatRuleViolation(violation)}`); return; }

      missingKeys.splice(missingKeys.indexOf(key), 1);
    }

    if (missingKeys.length > 0) { callback(`Missing key: ${missingKeys[0]}`); return; }

    if (node.id == null) {
      node.id = this.nextId.toString();
      this.nextId++;
    }
    this.byId[node.id] = node;
    this.parentNodesById[node.id] = this.byId[parentId];

    // Fix index if it's out of bounds
    if (index == null || index < 0 || index > siblings.length) index = siblings.length;
    siblings.splice(index, 0, node);

    callback(null, index);
    this.emit('change');
  }

  client_add(node: TreeNode, parentId: string, index: number) {
    var siblings = this.pub;
    if (parentId != null) siblings = (this.byId[parentId] != null) ? this.byId[parentId].children : null;
    siblings.splice(index, 0, node);

    this.byId[node.id] = node;
    this.parentNodesById[node.id] = this.byId[parentId];
  }


  move(id: string, parentId: string, index: number, callback: (err: string, index?: number) => any) {
    var node = this.byId[id]
    if (node == null) { callback(`Invalid node id: ${id}`); return; }

    if (parentId != null) {
      var parentNode = this.byId[parentId];
      if (parentNode == null || parentNode.children == null) { callback(`Invalid parent node id: ${parentId}`); return; }
    }

    // Adjust insertion index if needed
    var siblings = (parentNode != null) ? parentNode.children : this.pub;
    if (index == null || index < 0 || index > siblings.length) index = siblings.length;

    var oldSiblings = (this.parentNodesById[id] != null) ? this.parentNodesById[id].children : this.pub;
    var oldIndex = oldSiblings.indexOf(node);
    oldSiblings.splice(oldIndex, 1);

    var actualIndex = index;
    if (siblings == oldSiblings && oldIndex < actualIndex) actualIndex--;
    siblings.splice(actualIndex, 0, node);

    this.parentNodesById[id] = parentNode;

    callback(null, index);
    this.emit('change');
  }

  client_move(id: string, parentId: string, index: number) {
    var node = this.byId[id];

    var parentNode = (parentId != null) ? this.byId[parentId] : null;
    var siblings = (parentNode != null) ? this.byId[parentId].children : this.pub;

    var oldSiblings = (this.parentNodesById[id] != null) ? this.parentNodesById[id].children : this.pub;
    var oldIndex = oldSiblings.indexOf(node);
    oldSiblings.splice(oldIndex, 1);

    var actualIndex = index;
    if (siblings == oldSiblings && oldIndex < actualIndex) actualIndex--;
    siblings.splice(actualIndex, 0, node);

    this.parentNodesById[id] = parentNode;
  }


  remove(id: string, callback: (err: string) => any) {
    var node = this.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`); return; }

    var siblings = (this.parentNodesById[id] != null) ? this.parentNodesById[id].children : this.pub;
    siblings.splice(siblings.indexOf(node), 1);

    delete this.parentNodesById[id];
    delete this.byId[id];

    callback(null);
    this.emit('change');
  }

  client_remove(id: string) {
    var node = this.byId[id];

    var siblings = (this.parentNodesById[id] != null) ? this.parentNodesById[id].children : this.pub;
    siblings.splice(siblings.indexOf(node), 1);

    delete this.parentNodesById[id];
    delete this.byId[id];
  }

  // clear() {}

  // FIXME: Replace key with path and support nested properties
  setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any) {
    var node = this.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`); return; }

    var rule = this.schema[key];
    if (rule == null) { callback(`Invalid key: ${key}`); return; }
    var violation = base.getRuleViolation(value, rule);
    if (violation != null) { callback(`Invalid value: ${base.formatRuleViolation(violation)}`); return; }

    node[key] = value;

    callback(null, value);
    this.emit('change');
  }

  client_setProperty(id: string, key: string, value: any) {
    this.byId[id][key] = value;
  }
}

export = TreeById;
