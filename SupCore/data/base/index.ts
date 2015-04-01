export import Hash = require("./Hash");
export import ListById = require("./ListById");
export import TreeById = require("./TreeById");
export import Dictionary = require("./Dictionary");
export import Asset = require("./Asset");
export import Resource = require("./Resource");
export import ComponentConfig = require("./ComponentConfig");

export function getRuleViolation(value, rule, create = false): { message: string; path?: string } {
  if (!create && ! rule.mutable) return { message: "Immutable" };

  var optional = rule.type[rule.type.length - 1] == "?"
  if (optional && value == null) return null;

  var ruleType: string;
  if (optional) ruleType = rule.type.slice(0, rule.type.length - 1);
  else ruleType = rule.type;

  switch (ruleType) {
    case "boolean": {
      if (typeof (value) != "boolean") return { message: "Expected boolean" };
      break;
    }

    case "number":
    case "integer": {
      if (typeof (value) != "number") return { message: "Expected number" };
      if (ruleType == "integer" && (value % 1) != 0) return { message: "Expected an integer" };

      if (rule.min != null && value < rule.min) return { message: `Value (${value}) is less than minimum value (${rule.min})` };
      if (rule.max != null && value > rule.max) return { message: `Value (${value}) is greater than maximum value (${rule.max})` };
      break;
    }

    case "string": {
      if (typeof (value) != "string") return { message: "Expected string" };

      if (rule.length != null && value.length != rule.length) return { message: `String should have length of ${rule.length}, got ${value.length}` };
      if (rule.minLength != null && value.length < rule.minLength) return { message: `String length (${value.length}) is less than minimum length (${rule.minLength})` };
      if (rule.maxLength != null && value.length > rule.maxLength) return { message: `String length (${value.length}) is greater than maximum length (${rule.maxLength})` };
      break;
    }

    case "enum": {
      if (typeof (value) != "string") return { message: "Expected string for enum" };

      if (rule.items.indexOf(value) == -1) return { message: `Invalid enum value: ${value}` };
      break;
    }

    case "hash": {
      if (typeof (value) != "object") return { message: "Expected hash" };

      var ruleProperties = (rule.properties != null) ? rule.properties : {};
      var missingKeys = Object.keys(ruleProperties);

      for (var key in value) {
        var propertyValue = value[key];
        var propertyRule = ruleProperties[key];

        if (propertyRule == null) {

          if (rule.values == null) return { message: `Unexpected hash key: ${key}`, path: key };

          if (rule.keys != null) {
            if (rule.keys.length != null && key.length != rule.keys.length) return { message: `Key should have length of ${rule.keys.length}, got ${key.length}`, path: key };
            if (rule.keys.minLength != null && key.length < rule.keys.minLength) return { message: `Key length (${key.length}) is less than minimum length (${rule.keys.minLength})`, path: key };
            if (rule.keys.maxLength != null && key.length > rule.keys.maxLength) return { message: `Key length (${key.length}) is greater than maximum length (${rule.keys.maxLength})`, path: key };
          }

          var violation = getRuleViolation(propertyValue, rule.values, true);
          if (violation != null) {
            var violationPath = (violation.path != null) ? `${key}.${violation.path}` : key;
            return { message: violation.message, path: violationPath };
          }
        }

        else {
          var violation = getRuleViolation(propertyValue, propertyRule, true);
          if (violation != null) {
            var violationPath = (violation.path != null) ? `${key}.${violation.path}` : key;
            return { message: violation.message, path: violationPath }
          }
          missingKeys.splice(missingKeys.indexOf(key), 1);
        }
      }

      // Ignore optional keys
      var actualMissingKeys = []
      missingKeys.forEach((missingKey) => {
        var missingKeyRuleType = ruleProperties[missingKey].type;
        if (missingKeyRuleType[missingKeyRuleType.length - 1] != "?") actualMissingKeys.push(missingKey);
      });
      if (actualMissingKeys.length > 0) return { message: `Missing hash keys: ${actualMissingKeys.join(", ") }` };
      break;
    }

    case "array": {
      if (! Array.isArray(value)) return { message: "Expected array" };

      if (rule.length != null && value.length != rule.length) return { message: `Array should have length of ${rule.length}, got ${value.length}` };
      if (rule.minLength != null && value.length < rule.minLength) return { message: `Array length (${value.length}) is less than minimum length (${rule.minLength})` };
      if (rule.maxLength != null && value.length > rule.maxLength) return { message: `Array length (${value.length}) is greater than maximum length (${rule.maxLength})` };

      value.forEach((item,index) => {
        var violation = getRuleViolation(item, rule.items, true);
        if (violation != null) {
          var violationPath = (violation.path != null) ? `[${index}].${violation.path}` : `[${index}]`;
          return { message: violation.message, path: violationPath };
        }
      });
      break;
    }

    case "any": {
      // No validation at all
      break;
    }

    default: {
      console.warn("getRuleViolation - Unhandled rule type:");
      console.warn(ruleType);
    }
  }
  return null;
}

export function formatRuleViolation(violation): string {
  if (violation == null) return "No error";

  var text = violation.message
  if (violation.path != null) text += ` at ${violation.path}`;
  return text
}
