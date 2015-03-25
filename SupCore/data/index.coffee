exports.base = require './base'

exports.Projects = require './Projects'

exports.Manifest = require './Manifest'
exports.Internals = require './Internals'
exports.Members = require './Members'
exports.Diagnostics = require './Diagnostics'
exports.Entries = require './Entries'

exports.Assets = require './Assets'

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

exports.registerAssetClass = (name, assetClass) ->
  if exports.assetClasses[name]?
    console.log "SupCore.data.registerAssetClass: Tried to register two or more asset classes named \"#{name}\""
    return

  exports.assetClasses[name] = assetClass
  return

exports.registerComponentConfigClass = (name, configClass) ->
  if exports.componentConfigClasses[name]?
    console.log "SupCore.data.registerComponentConfigClass: Tried to load two or more component configuration classes named \"#{name}\""
    return

  exports.componentConfigClasses[name] = configClass
  return
