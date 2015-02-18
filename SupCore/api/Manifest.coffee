base = require './base'

module.exports = class Manifest extends base.Hash

  constructor: (pub) ->
    super pub, {
      id: { type: 'string' }
      name: { type: 'string', minLength: 1, maxLength: 80, mutable: true }
      description: { type: 'string', maxLength: 300, mutable: true }
    }
