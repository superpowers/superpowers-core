base = require './'
{ EventEmitter } = require 'events'

module.exports = class TreeById extends EventEmitter

  constructor: (@pub, @schema, @nextId) ->
    super()

    @byId = {}
    @parentNodesById = {}

    maxNodeId = -1

    @walk (node, parentNode) =>
      maxNodeId = Math.max maxNodeId, node.id
      @byId[node.id] = node
      @parentNodesById[node.id] = parentNode
      return

    @nextId ?= maxNodeId + 1

  walk: (callback) ->

    walkRecurse = (node, parentNode) =>
      callback node, parentNode

      if node.children?
        walkRecurse child, node for child in node.children

      return

    walkRecurse node, null for node in @pub
    return
    
  getPathFromId: (id) ->
    name = @byId[id].name
    parent = @parentNodesById[id]
    loop
      break if ! parent?
      name = "#{parent.name}/#{name}"
      parent = @parentNodesById[parent.id]
      
    return name

  add: (node, parentId, index, callback) ->
    if node.id? and ! @schema.id? then callback "Found unexpected id key"; return

    siblings = if parentId? then @byId[parentId]?.children else @pub
    if ! siblings? then callback "Invalid parent id: #{parentId}"; return

    missingKeys = Object.keys(@schema)
    for key, value of node
      rule = @schema[key]
      if ! rule? then callback "Invalid key: #{key}"; return
      violation = base.getRuleViolation value, rule, true
      if violation? then callback "Invalid value: #{base.formatRuleViolation(violation)}"; return

      missingKeys.splice missingKeys.indexOf(key), 1

    if missingKeys.length > 0 then callback "Missing key: #{missingKeys[0]}"; return

    node.id ?= @nextId++
    @byId[node.id] = node
    @parentNodesById[node.id] = @byId[parentId]

    # Fix index if it's out of bounds
    index = siblings.length if ! index? or index < 0 or index >= siblings.length
    siblings.splice index, 0, node

    callback null, index
    @emit 'change'
    return

  client_add: (node, parentId, index) ->
    siblings = if parentId? then @byId[parentId]?.children else @pub
    siblings.splice index, 0, node

    @byId[node.id] = node
    @parentNodesById[node.id] = @byId[parentId]
    return


  move: (id, parentId, index, callback) ->
    node = @byId[id]
    if ! node? then callback "Invalid node id: #{id}"; return

    if parentId?
      parentNode = @byId[parentId]
      if ! parentNode? then callback "Invalid parent node id: #{parentId}"; return

    # Adjust insertion index if needed
    siblings = parentNode?.children ? @pub
    index = siblings.length if ! index? or index < 0 or index >= siblings.length

    oldSiblings = @parentNodesById[id]?.children ? @pub
    oldIndex = oldSiblings.indexOf(node)
    oldSiblings.splice oldIndex, 1

    actualIndex = index
    actualIndex-- if siblings == oldSiblings and oldIndex < actualIndex
    siblings.splice actualIndex, 0, node

    @parentNodesById[id] = parentNode

    callback null, index
    @emit 'change'
    return

  client_move: (id, parentId, index) ->
    node = @byId[id]

    parentNode = @byId[parentId] if parentId?
    siblings = parentNode?.children ? @pub
    
    oldSiblings = @parentNodesById[id]?.children ? @pub
    oldIndex = oldSiblings.indexOf(node)
    oldSiblings.splice oldIndex, 1

    actualIndex = index
    actualIndex-- if siblings == oldSiblings and oldIndex < actualIndex
    siblings.splice actualIndex, 0, node

    @parentNodesById[id] = parentNode
    return


  remove: (id, callback) ->
    node = @byId[id]
    if ! node? then callback "Invalid node id: #{id}"; return

    siblings = @parentNodesById[id]?.children ? @pub
    siblings.splice siblings.indexOf(node), 1

    delete @parentNodesById[id]
    delete @byId[id]

    callback()
    @emit 'change'
    return
    
  client_remove: (id) ->
    node = @byId[id]

    siblings = @parentNodesById[id]?.children ? @pub
    siblings.splice siblings.indexOf(node), 1

    delete @parentNodesById[id]
    delete @byId[id]
    return

  # clear: ->

  # FIXME: Replace key with path and support nested properties
  setProperty: (id, key, value, callback) ->
    node = @byId[id]
    if ! node? then callback "Invalid node id: #{id}"; return

    rule = @schema[key]
    if ! rule? then callback "Invalid key: #{key}"; return
    violation = base.getRuleViolation value, rule
    if violation? then callback "Invalid value: #{base.formatRuleViolation(violation)}"; return

    node[key] = value

    callback null, value
    @emit 'change'
    return

  client_setProperty: (id, key, value) ->
    @byId[id][key] = value
    return
