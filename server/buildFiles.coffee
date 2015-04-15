async = require 'async'
readdirRecursive = require 'recursive-readdir'
path = require 'path'

exports.init = (pluginNamesByAuthor, callback) ->
  exports.files = [ "/plugins.json" ]

  rootPublicPath = path.resolve "#{__dirname}/../public"

  for author, pluginNames of pluginNamesByAuthor
    for pluginName in pluginNames
      exports.files.push "/plugins/#{author}/#{pluginName}/api.js"
      exports.files.push "/plugins/#{author}/#{pluginName}/components.js"
      exports.files.push "/plugins/#{author}/#{pluginName}/runtime.js"

  addEntries = (entries) ->
    for entry in entries
      relativePath = path.relative(rootPublicPath, entry)
      if path.sep == '\\' then relativePath = relativePath.replace /\\/g, '/'
      exports.files.push "/#{relativePath}"
    return

  async.parallel [
    (cb) -> readdirRecursive "#{__dirname}/../public/player", (err, entries) ->
      addEntries entries; cb(); return

    (cb) -> readdirRecursive "#{__dirname}/../public/core", (err, entries) ->
      addEntries entries; cb(); return

    (cb) -> readdirRecursive "#{__dirname}/../public/api", (err, entries) ->
      addEntries entries; cb(); return

    (cb) -> readdirRecursive "#{__dirname}/../public/system", (err, entries) ->
      addEntries entries; cb(); return
  ], callback
  return
