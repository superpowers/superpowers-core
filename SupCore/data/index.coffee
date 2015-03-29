exports.base = require './base'

exports.Projects = require './Projects'

exports.Manifest = require './Manifest'
exports.Internals = require './Internals'
exports.Members = require './Members'
exports.Diagnostics = require './Diagnostics'
exports.Entries = require './Entries'

exports.Assets = require './Assets'
exports.Resources = require './Resources'

exports.Rooms = require './Rooms'
exports.Room = require './Room'
exports.RoomUsers = require './RoomUsers'

exports.hasDuplicateName = (id, name, siblings) ->
  for sibling in siblings
    if sibling.id != id and sibling.name == name
      return true

  return false

exports.ensureUniqueName = (id, name, siblings) ->
  name = name.trim()
  candidateName = name
  nameNumber = 1

  while exports.hasDuplicateName id, candidateName, siblings
    candidateName = "#{name} (#{nameNumber++})"

  candidateName

exports.assetClasses = {}
exports.componentConfigClasses = {}
exports.resourceClasses = {}

exports.registerAssetClass = (name, assetClass) ->
  if exports.assetClasses[name]?
    console.log "SupCore.data.registerAssetClass: Tried to register two or more asset classes named \"#{name}\""
    return

  exports.assetClasses[name] = assetClass
  return

exports.registerComponentConfigClass = (name, configClass) ->
  if exports.componentConfigClasses[name]?
    console.log "SupCore.data.registerComponentConfigClass: Tried to register two or more component configuration classes named \"#{name}\""
    return

  exports.componentConfigClasses[name] = configClass
  return

# This registers a plugin *resource* (see SupCore.data.Resources), not just a resource class, hence the name
exports.registerResource = (name, resourceClass) ->
  if exports.resourceClasses[name]?
    console.log "SupCore.data.registerResource: Tried to register two or more plugin resources named \"#{name}\""
    return

  exports.resourceClasses[name] = resourceClass
  return


# Deprecated
exports.assetPlugins = exports.assetClasses
exports.componentConfigPlugins = exports.componentConfigClasses

exports.addAssetPlugin = (name, assetClass) ->
  console.warn "SupCore.data.addAssetPlugin and SupCore.data.assetPlugins are deprecated and will be removed soon. Please use SupCore.data.registerAssetClass and SupCore.data.assetClasses instead."
  exports.registerAssetClass name, assetClass; return

exports.addComponentConfigPlugin = (name, configClass) ->
  console.warn "SupCore.data.addComponentConfigPlugin and SupCore.data.componentConfigPlugins are deprecated and will be removed soon. Please use SupCore.data.registerComponentConfigClass and SupCore.data.componentConfigClasses instead."
  exports.registerComponentConfigClass name, configClass; return
