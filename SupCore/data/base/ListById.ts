import * as base from "./index";
import { EventEmitter } from "events";

export default class ListById extends EventEmitter {
  pub: any[];
  schema: any;
  generateNextId: Function;
  nextId = 0;

  byId: {[id: string]: any} = {};

  constructor(pub: any[], schema: any, generateNextId?: Function) {
    super();
    this.pub = pub;
    this.schema = schema;
    this.generateNextId = generateNextId;

    let maxItemId = -1;

    for (let item of this.pub) {
      // TODO: Remove this cast at some point, legacy stuff from Superpowers 0.4
      if (typeof item.id == 'number') item.id = item.id.toString();

      this.byId[item.id] = item;
      maxItemId = Math.max(maxItemId, item.id);
    }

    if (this.generateNextId == null) {
      this.generateNextId = () => {
        let id = this.nextId.toString();
        this.nextId++;
        return id;
      };
      this.nextId = maxItemId + 1;
    }
  }

  add(item: any, index: number, callback: (err: string, index?: number) => any) {
    if (item.id != null && this.schema.id == null) { callback("Found unexpected id key"); return; }

    let missingKeys = Object.keys(this.schema);
    for (let key in item) {
      let value = item[key];
      let rule = this.schema[key];
      if (rule == null) { callback(`Invalid key: ${key}`); return; }
      let violation = base.getRuleViolation(value, rule, true);
      if (violation != null) { callback(`Invalid value: ${base.formatRuleViolation(violation)}`); return; }

      missingKeys.splice(missingKeys.indexOf(key), 1);
    }

    if (missingKeys.length > 0) { callback(`Missing key: ${missingKeys[0]}`); return; }

    if (item.id == null) item.id = this.generateNextId();
    this.byId[item.id] = item;

    // Fix index if it's out of bounds
    if (index == null || index < 0 || index >= this.pub.length) index = this.pub.length;
    this.pub.splice(index, 0, item);

    callback(null, index);
    this.emit("change");
  }

  client_add(item: any, index: number) {
    this.byId[item.id] = item;
    this.pub.splice(index, 0, item);
  }

  move(id: string, index: number, callback: (err: string, index?: number) => any) {
    let item = this.byId[id];
    if (item == null) { callback(`Invalid item id: ${id}`); return; }

    if (index == null || index < 0 || index >= this.pub.length) index = this.pub.length;
    let oldIndex = this.pub.indexOf(item);

    this.pub.splice(oldIndex, 1);

    let actualIndex = index;
    if (oldIndex < actualIndex) actualIndex--;
    this.pub.splice(actualIndex, 0, item);

    callback(null, index);
    this.emit('change');
  }

  client_move(id: string, newIndex: number) {
    let item = this.byId[id];

    this.pub.splice(this.pub.indexOf(item), 1);
    this.pub.splice(newIndex, 0, item);
  }

  remove(id: string, callback: (err: string, index?: number) => any) {
    let item = this.byId[id];
    if (item == null) { callback(`Invalid item id: ${id}`); return; }

    let index = this.pub.indexOf(item);
    this.pub.splice(index, 1);
    delete this.byId[id];

    callback(null, index);
    this.emit('change');
  }

  client_remove(id: string) {
    let item = this.byId[id];
    this.pub.splice(this.pub.indexOf(item), 1);
    delete this.byId[id];
  }

  // clear: ->

  // FIXME: Replace key with path and support nested properties
  setProperty(id: string, key: string, value: number|string|boolean, callback: (err: string, value?: any) => any) {
    let item = this.byId[id];
    if (item == null) { callback(`Invalid item id: ${id}`); return; }

    let rule = this.schema[key];
    if (rule == null) { callback(`Invalid key: ${key}`); return; }
    let violation = base.getRuleViolation(value, rule);
    if (violation != null) { callback(`Invalid value: ${base.formatRuleViolation(violation)}`); return; }

    item[key] = value;

    callback(null, value);
    this.emit('change');
  }

  client_setProperty(id: string, key: string, value: number|string|boolean) {
    this.byId[id][key] = value;
  }
}
