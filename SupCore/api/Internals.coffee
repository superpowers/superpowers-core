base = require './base'

module.exports = class Internals extends base.Hash

  constructor: (pub) ->
    super pub, {
      nextBuildId: { type: 'integer', min: 0, mutable: true }
      nextEntryId: { type: 'integer', min: 0, mutable: true }
    }
