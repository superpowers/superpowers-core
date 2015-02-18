base = require './base'

module.exports = class Members extends base.ListById

  constructor: (pub) ->
    super pub, {
      cachedUsername: { type: 'string' }
    }
