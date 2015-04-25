import * as base from "./index";
import { EventEmitter } from "events";

export default class Hash extends EventEmitter {
  pub: any;
  schema: any;

  constructor(pub: any, schema: any) {
    super();

    this.pub = pub;
    this.schema = schema;
  }

  setProperty(path: string, value: number|string|boolean, callback: (err: string, value?: any) => any) {
    let parts = path.split('.');

    let rule = this.schema[parts[0]];
    for (let part of parts.slice(1)) rule = rule.properties[part];

    if (rule == null) { callback(`Invalid key: ${path}`); return; }
    let violation = base.getRuleViolation(value, rule);
    if (violation != null) { callback(`Invalid value: ${base.formatRuleViolation(violation)}`); return; }

    let obj = this.pub;
    for (let part of parts.slice(0, parts.length - 1)) obj = obj[part];
    obj[parts[parts.length - 1]] = value;

    callback(null, value);
    this.emit('change');
  }

  client_setProperty(path: string, value: number|string|boolean) {
    let parts = path.split('.');

    let obj = this.pub;
    for (let part of parts.slice(0, parts.length - 1)) obj = obj[part];
    obj[parts[parts.length - 1]] = value;
  }
}
