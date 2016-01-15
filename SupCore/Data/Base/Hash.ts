import * as base from "./index";
import { EventEmitter } from "events";

export default class Hash extends EventEmitter {
  constructor(public pub: any, public schema: SupCore.Data.Schema) {
    super();
  }

  setProperty(path: string, value: number|string|boolean, callback: (err: string, value?: any) => any) {
    const parts = path.split(".");

    let rule = this.schema[parts[0]];
    for (const part of parts.slice(1)) {
      rule = rule.properties[part];
      if (rule.type === "any") break;
    }

    if (rule == null) { callback(`Invalid key: ${path}`); return; }
    if (rule.type !== "any") {
      const violation = base.getRuleViolation(value, rule);
      if (violation != null) { callback(`Invalid value for ${path}: ${base.formatRuleViolation(violation)}`); return; }
    }

    let obj = this.pub;
    for (const part of parts.slice(0, parts.length - 1)) obj = obj[part];
    obj[parts[parts.length - 1]] = value;

    callback(null, value);
    this.emit("change");
  }

  client_setProperty(path: string, value: number|string|boolean) {
    const parts = path.split(".");

    let obj = this.pub;
    for (const part of parts.slice(0, parts.length - 1)) obj = obj[part];
    obj[parts[parts.length - 1]] = value;
  }
}
