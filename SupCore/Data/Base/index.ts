/* tslint:disable:no-unused-variable */
import Hash from "./Hash";
import ListById from "./ListById";
import TreeById from "./TreeById";
import Dictionary from "./Dictionary";
import Asset from "./Asset";
import Resource from "./Resource";
/* tslint:enable:no-unused-variable */
export { Hash, ListById, TreeById, Dictionary, Asset, Resource };

interface Rule {
  mutable?: boolean;
  type: string;

  // Number
  min?: number;
  minExcluded?: number;
  max?: number;
  maxExcluded?: number;

  // String
  length?: number;
  minLength?: number;
  maxLength?: number;

  // Enum or Array
  items?: string[] | Rule;

  // Hash
  keys?: { length?: number; minLength?: number; maxLength?: number; };
  values?: Rule;
  properties?: { [key: string]: Rule; };
}
interface Violation {
  message: string; path?: string;
}
export function getRuleViolation(value: any, rule: Rule, create = false): Violation {
  if (!create && !rule.mutable) return { message: "Immutable" };

  const optional = rule.type[rule.type.length - 1] === "?";
  if (optional && value == null) return null;

  let ruleType: string;
  if (optional) ruleType = rule.type.slice(0, rule.type.length - 1);
  else ruleType = rule.type;

  switch (ruleType) {
    case "boolean": {
      if (typeof value !== "boolean") return { message: "Expected boolean" };
    } break;

    case "number":
    case "integer": {
      if (typeof value !== "number") return { message: `Expected ${ruleType}` };
      if (ruleType === "integer" && (value % 1) !== 0) return { message: "Expected integer" };

      if (rule.min != null && value < rule.min) return { message: `Value (${value}) is less than minimum value (${rule.min})` };
      if (rule.minExcluded != null && value <= rule.minExcluded) return { message: `Value (${value}) is less than minimum value (${rule.min})` };
      if (rule.max != null && value > rule.max) return { message: `Value (${value}) is greater than maximum value (${rule.max})` };
      if (rule.maxExcluded != null && value >= rule.maxExcluded) return { message: `Value (${value}) is greater than maximum value (${rule.max})` };
    } break;

    case "string": {
      if (typeof value !== "string") return { message: "Expected string" };

      if (rule.length != null && value.length !== rule.length) return { message: `String should have length of ${rule.length}, got ${value.length}` };
      if (rule.minLength != null && value.length < rule.minLength) return { message: `String length (${value.length}) is less than minimum length (${rule.minLength})` };
      if (rule.maxLength != null && value.length > rule.maxLength) return { message: `String length (${value.length}) is greater than maximum length (${rule.maxLength})` };
    } break;

    case "enum": {
      if (typeof value !== "string") return { message: "Expected string for enum" };

      const items = rule.items as string[];
      if (items.indexOf(value) === -1) return { message: `Invalid enum value: ${value}` };
    } break;

    case "hash": {
      if (value == null || typeof value !== "object") return { message: "Expected hash" };

      const ruleProperties: {[key: string]: Rule} = (rule.properties != null) ? rule.properties : {};
      const missingKeys = Object.keys(ruleProperties);

      for (const key in value) {
        const propertyValue = value[key];
        const propertyRule = ruleProperties[key];

        if (propertyRule == null) {
          if (rule.values == null) return { message: `Unexpected hash key: ${key}`, path: key };

          if (rule.keys != null) {
            if (rule.keys.length != null && key.length !== rule.keys.length) return { message: `Key should have length of ${rule.keys.length}, got ${key.length}`, path: key };
            if (rule.keys.minLength != null && key.length < rule.keys.minLength) return { message: `Key length (${key.length}) is less than minimum length (${rule.keys.minLength})`, path: key };
            if (rule.keys.maxLength != null && key.length > rule.keys.maxLength) return { message: `Key length (${key.length}) is greater than maximum length (${rule.keys.maxLength})`, path: key };
          }

          const violation = getRuleViolation(propertyValue, rule.values, true);
          if (violation != null) {
            const violationPath = (violation.path != null) ? `${key}.${violation.path}` : key;
            return { message: violation.message, path: violationPath };
          }
        }

        else {
          const violation = getRuleViolation(propertyValue, propertyRule, true);
          if (violation != null) {
            const violationPath = (violation.path != null) ? `${key}.${violation.path}` : key;
            return { message: violation.message, path: violationPath };
          }
          missingKeys.splice(missingKeys.indexOf(key), 1);
        }
      }

      // Ignore optional keys
      const actualMissingKeys: string[] = [];
      for (const missingKey of missingKeys) {
        const missingKeyRuleType = ruleProperties[missingKey].type;
        if (missingKeyRuleType[missingKeyRuleType.length - 1] !== "?") actualMissingKeys.push(missingKey);
      }
      if (actualMissingKeys.length > 0) return { message: `Missing hash keys: ${actualMissingKeys.join(", ") }` };
    } break;

    case "array": {
      if (!Array.isArray(value)) return { message: "Expected array" };

      if (rule.length != null && value.length !== rule.length) return { message: `Array should have length of ${rule.length}, got ${value.length}` };
      if (rule.minLength != null && value.length < rule.minLength) return { message: `Array length (${value.length}) is less than minimum length (${rule.minLength})` };
      if (rule.maxLength != null && value.length > rule.maxLength) return { message: `Array length (${value.length}) is greater than maximum length (${rule.maxLength})` };

      if (rule.items != null) {
        for (let index = 0; index < value.length; index++) {
          const item: any = value[index];
          const violation = getRuleViolation(item, rule.items as Rule, true);
          if (violation != null) {
            const violationPath = (violation.path != null) ? `[${index}].${violation.path}` : `[${index}]`;
            return { message: violation.message, path: violationPath };
          }
        }
      }
    } break;

    case "any": {
      // No validation at all
    } break;

    default: {
      console.warn(`getRuleViolation - Unhandled rule type: ${ruleType}`);
    }
  }
  return null;
}

export function formatRuleViolation(violation: Violation): string {
  if (violation == null) return "No error";
  return (violation.path != null) ? `${violation.message} at ${violation.path}` : violation.message;
}
