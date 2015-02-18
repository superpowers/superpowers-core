base = require './'
{ EventEmitter } = require 'events'

module.exports = class ListById extends EventEmitter

  constructor: (@pub, @schema, @generateNextId) ->
    super()

    @byId = {}

    maxItemId = -1

    for item in @pub
      @byId[item.id] = item
      maxItemId = Math.max maxItemId, item.id

    if ! @generateNextId?
      @generateNextId = => @nextId++
      @nextId = maxItemId + 1

  add: (item, index, callback) ->
    if item.id? and ! @schema.id? then callback "Found unexpected id key"; return

    missingKeys = Object.keys(@schema)
    for key, value of item
      rule = @schema[key]
      if ! rule? then callback "Invalid key: #{key}"; return
      violation = base.getRuleViolation value, rule, true
      if violation? then callback "Invalid value: #{base.formatRuleViolation(violation)}"; return

      missingKeys.splice missingKeys.indexOf(key), 1

    if missingKeys.length > 0 then callback "Missing key: #{missingKeys[0]}"; return

    item.id ?= @generateNextId()
    @byId[item.id] = item

    # Fix index if it's out of bounds
    index = @pub.length if ! index? or index < 0 or index >= @pub.length
    @pub.splice index, 0, item

    callback null, index
    @emit 'change'
    return

  client_add: (item, index) ->
    @byId[item.id] = item
    @pub.splice index, 0, item
    return

  move: (id, index, callback) ->
    item = @byId[id]
    if ! item? then callback "Invalid item id: #{id}"; return

    index = @pub.length if ! index? or index < 0 or index >= @pub.length
    oldIndex = @pub.indexOf(item)

    @pub.splice oldIndex, 1

    actualIndex = index
    actualIndex-- if oldIndex < actualIndex
    @pub.splice actualIndex, 0, item

    callback null, index
    @emit 'change'
    return
    
  client_move: (id, newIndex) ->
    item = @byId[id]

    @pub.splice @pub.indexOf(item), 1
    @pub.splice newIndex, 0, item
    return

  remove: (id, callback) ->
    item = @byId[id]
    if ! item? then callback "Invalid item id: #{id}"; return
    
    index = @pub.indexOf(item)
    @pub.splice index, 1
    delete @byId[id]
    
    callback null, index
    @emit 'change'
    return
    
  client_remove: (id) ->
    item = @byId[id]
    @pub.splice @pub.indexOf(item), 1
    delete @byId[id]
    return

  # clear: ->

  # FIXME: Replace key with path and support nested properties
  setProperty: (id, key, value, callback) ->
    item = @byId[id]
    if ! item? then callback "Invalid item id: #{id}"; return

    rule = @schema[key]
    if ! rule? then callback "Invalid key: #{key}"; return
    violation = base.getRuleViolation value, rule
    if violation? then callback "Invalid value: #{base.formatRuleViolation(violation)}"; return

    item[key] = value
    
    callback null, value
    @emit 'change'
    return

  client_setProperty: (id, key, value) ->
    @byId[id][key] = value
    return
