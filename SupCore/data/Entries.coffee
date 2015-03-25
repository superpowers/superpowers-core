SupData = require './'

module.exports = class Entries extends SupData.base.TreeById

  @schema =
    name: { type: 'string', minLength: 1, maxLength: 80, mutable: true }
    type: { type: 'string?' }
    diagnostics: { type: 'listById?' }
    dependentAssetIds: { type: 'array', items: { type: 'integer' } }

  constructor: (pub, nextId) ->
    super pub, @constructor.schema, nextId

    @diagnosticsByEntryId = {}
    @dependenciesByAssetId = {}

    @walk (node, parentNode) =>
      return if ! node.type?

      node.diagnostics ?= []
      @diagnosticsByEntryId[node.id] = new SupData.Diagnostics node.diagnostics
      node.dependentAssetIds ?= []
      return

  add: (node, parentId, index, callback) ->
    if node.type? and ! SupData.assetClasses[node.type]?
      callback "Invalid asset type"; return

    super node, parentId, index, (err, actualIndex) =>
      if err? then callback err; return

      siblings = if parentId? then @byId[parentId]?.children else @pub
      node.name = SupData.ensureUniqueName node.id, node.name, siblings

      if node.type?
        diagnostics = new SupData.Diagnostics node.diagnostics
        @diagnosticsByEntryId[node.id] = diagnostics
        node.diagnostics = diagnostics.pub
      else
        node.children = []

      callback null, actualIndex
      return
    return

  client_add: (node, parentId, index) ->
    super node, parentId, index
    @diagnosticsByEntryId[node.id] = new SupData.Diagnostics node.diagnostics
    return


  move: (id, parentId, index, callback) ->
    node = @byId[id]
    if ! node? then callback "Invalid node id: #{id}"; return

    # Check that the requested parent is indeed a folder
    siblings = if parentId? then @byId[parentId]?.children else @pub
    if ! siblings? then callback "Invalid parent node id: #{parentId}"; return

    if SupData.hasDuplicateName node.id, node.name, siblings
      callback "There's already an entry with this name in this folder"; return

    super id, parentId, index, callback
    return


  remove: (id, callback) ->
    node = @byId[id]
    if ! node? then callback "Invalid node id: #{id}"; return
    if ! node.type? and node.children?.length != 0 then callback "The folder must be empty"; return

    super id, callback
    return


  setProperty: (id, key, value, callback) ->
    if key == 'name'
      if typeof(value) != 'string' then callback "Invalid value"; return
      value = value.trim()

      siblings = @parentNodesById[id]?.children ? @pub
      if SupData.hasDuplicateName id, value, siblings
        callback "There's already an entry with this name in this folder"; return

    super id, key, value, callback


  getForStorage: ->
    entries = []
    entriesById = {}

    @walk (entry, parentEntry) ->
      savedEntry = { id: entry.id, name: entry.name, type: entry.type }
      savedEntry.children = [] if entry.children?
      entriesById[savedEntry.id] = savedEntry

      if ! parentEntry? then entries.push savedEntry
      else entriesById[parentEntry.id].children.push savedEntry
      return
    entries
