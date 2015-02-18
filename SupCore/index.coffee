exports.api = require './api'
exports.log = (message) -> console.log "#{new Date().toISOString()} - #{message}"; return
