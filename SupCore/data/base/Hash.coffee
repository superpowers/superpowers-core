base = require './'
{ EventEmitter } = require 'events'

module.exports = class Hash extends EventEmitter

  constructor: (@pub, @schema) ->
    super()

  setProperty: (path, value, callback) ->
    parts = path.split '.'

    rule = @schema[parts[0]]
    rule = rule.properties[part] for part in parts.slice(1)

    if ! rule? then callback "Invalid key: #{path}"; return
    violation = base.getRuleViolation(value, rule)
    if violation? then callback "Invalid value: #{base.formatRuleViolation(violation)}"; return

    obj = @pub
    obj = obj[part] for part in parts.slice(0, parts.length - 1)
    obj[parts[parts.length - 1]] = value

    callback? null, value
    @emit 'change'
    return

  client_setProperty: (path, value) ->
    parts = path.split '.'
    
    obj = @pub
    obj = obj[part] for part in parts.slice(0, parts.length - 1)
    obj[parts[parts.length - 1]] = value
    return
