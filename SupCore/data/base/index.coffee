exports.Hash = require './Hash'
exports.ListById = require './ListById'
exports.TreeById = require './TreeById'
exports.Dictionary = require './Dictionary'
exports.Asset = require './Asset'
exports.ComponentConfig = require './ComponentConfig'

exports.getRuleViolation = (value, rule, create=false) ->
  if ! create and ! rule.mutable then return { message: "Immutable" }

  optional = rule.type[rule.type.length - 1] == '?'
  if optional and ! value? then return null

  ruleType =
    if optional then rule.type.slice 0, rule.type.length - 1
    else rule.type

  switch ruleType
    when 'boolean'
      if typeof(value) != 'boolean' then return { message: "Expected boolean" }

    when 'number', 'integer'
      if typeof(value) != 'number' then return { message: "Expected number" }
      if ruleType == 'integer' and (value % 1) != 0 then return { message: "Expected an integer" }

      if rule.min? and value < rule.min then return { message: "Value (#{value}) is less than minimum value (#{rule.min})" }
      if rule.max? and value > rule.max then return { message: "Value (#{value}) is greater than maximum value (#{rule.max})" }

    when 'string'
      if typeof(value) != 'string' then return { message: "Expected string" }

      if rule.length? and value.length != rule.length then return { message: "String should have length of #{rule.length}, got #{value.length}" }
      if rule.minLength? and value.length < rule.minLength then return { message: "String length (#{value.length}) is less than minimum length (#{rule.minLength})" }
      if rule.maxLength? and value.length > rule.maxLength then return { message: "String length (#{value.length}) is greater than maximum length (#{rule.maxLength})" }

    when 'enum'
      if typeof(value) != 'string' then return { message: "Expected string for enum" }

      if rule.items.indexOf(value) == -1 then return { message: "Invalid enum value: #{value}" }

    when 'hash'
      if typeof(value) != 'object' then return { message: "Expected hash" }

      ruleProperties = rule.properties ? {}

      missingKeys = Object.keys(ruleProperties)
      for key, propertyValue of value
        propertyRule = ruleProperties[key]
        if ! propertyRule?
          return { message: "Unexpected hash key: #{key}", path: key } if ! rule.values?

          if rule.keys?
            if rule.keys.length? and key.length != rule.keys.length then return { message: "Key should have length of #{rule.keys.length}, got #{key.length}", path: key }
            if rule.keys.minLength? and key.length < rule.keys.minLength then return { message: "Key length (#{key.length}) is less than minimum length (#{rule.keys.minLength})", path: key }
            if rule.keys.maxLength? and key.length > rule.keys.maxLength then return { message: "Key length (#{key.length}) is greater than maximum length (#{rule.keys.maxLength})", path: key }

          violation = exports.getRuleViolation propertyValue, rule.values, true
          if violation?
            violationPath = if violation.path? then "#{key}.#{violation.path}" else key
            return { message: violation.message, path: violationPath }

        else
          violation = exports.getRuleViolation propertyValue, propertyRule, true
          if violation?
            violationPath = if violation.path? then "#{key}.#{violation.path}" else key
            return { message: violation.message, path: violationPath }

          missingKeys.splice missingKeys.indexOf(key), 1

      # Ignore optional keys
      actualMissingKeys = []
      for missingKey in missingKeys
        missingKeyRuleType = ruleProperties[missingKey].type
        if missingKeyRuleType[missingKeyRuleType.length - 1] != '?'
          actualMissingKeys.push missingKey

      if actualMissingKeys.length > 0 then return { message: "Missing hash keys: #{actualMissingKeys.join(', ')}" }

    when 'array'
      if ! Array.isArray(value) then return { message: "Expected array" }

      if rule.length? and value.length != rule.length then return { message: "Array should have length of #{rule.length}, got #{value.length}" }
      if rule.minLength? and value.length < rule.minLength then return { message: "Array length (#{value.length}) is less than minimum length (#{rule.minLength})" }
      if rule.maxLength? and value.length > rule.maxLength then return { message: "Array length (#{value.length}) is greater than maximum length (#{rule.maxLength})" }

      for item, index in value
        violation = exports.getRuleViolation item, rule.items, true
        if violation?
          violationPath = if violation.path? then "[#{index}].#{violation.path}" else "[#{index}]"
          return { message: violation.message, path: violationPath }

    when 'any'
      # No validation at all

    else
      console.warn "getRuleViolation - Unhandled rule type:"
      console.warn ruleType

  return null

exports.formatRuleViolation = (violation) ->
  if ! violation? then return "No error"

  text = violation.message
  if violation.path? then text += " at #{violation.path}"

  text
