import base = require("./index");
import events = require("events");

class Hash extends events.EventEmitter {
  pub: any;
  schema: any;

  constructor(pub, schema) {
    super()

    this.pub = pub;
    this.schema = schema;
  }

  setProperty(path: string, value, callback: (err: string, value?: any) => any) {
    var parts = path.split('.');

    var rule = this.schema[parts[0]];
    parts.slice(1).forEach((part) => { rule = rule.properties[part]; });

    if (rule == null) { callback(`Invalid key: ${path}`); return; }
    var violation = base.getRuleViolation(value, rule);
    if (violation != null) { callback(`Invalid value: ${base.formatRuleViolation(violation)}`); return; }

    var obj = this.pub;
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; });
    obj[parts[parts.length - 1]] = value;

    callback(null, value);
    this.emit('change');
  }

  client_setProperty(path: string, value) {
    var parts = path.split('.');

    var obj = this.pub;
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; });
    obj[parts[parts.length - 1]] = value;
  }
}

export = Hash;
