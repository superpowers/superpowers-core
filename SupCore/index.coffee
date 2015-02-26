exports.data = require './data'
exports.log = (message) ->
  text = "#{new Date().toISOString()} - #{message}"
  console.log text
  process?.send? text
  return
