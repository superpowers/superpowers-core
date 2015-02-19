exports.api = require './api'
exports.log = (message) ->
  text = "#{new Date().toISOString()} - #{message}"
  console.log text
  process?.send? text
  return
