exports.base = require './base'

exports.Projects = require './Projects'

exports.Manifest = require './Manifest'
exports.Internals = require './Internals'
exports.Members = require './Members'
exports.Diagnostics = require './Diagnostics'
exports.Entries = require './Entries'

exports.Assets = require './Assets'

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

exports.assetPlugins = {}
exports.componentConfigPlugins = {}

exports.addAssetPlugin = (name, plugin) ->
  if exports.assetPlugins[name]?
    console.log "SupCore.api.addAssetPlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.assetPlugins[name] = plugin
  return

exports.addComponentConfigPlugin = (name, plugin) ->
  if exports.componentConfigPlugins[name]?
    console.log "SupCore.api.addComponentConfigPlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.componentConfigPlugins[name] = plugin
  return
