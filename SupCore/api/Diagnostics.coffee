base = require './base'

module.exports = class Diagnostics extends base.ListById

  constructor: (pub) ->
    super pub, {
      id: { type: 'string' }
      type: { type: 'string' }
      data: { type: 'any' }
    }
