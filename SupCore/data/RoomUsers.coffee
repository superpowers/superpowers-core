base = require './base'

module.exports = class RoomUsers extends base.ListById

  @schema =
    # TODO: use userId for id when we've got proper login
    id: { type: 'string', minLength: 3, maxLength: 20 }
    # username: { type: 'string', minLength: 3, maxLength: 20 }

  constructor: (pub) ->
    super pub, @constructor.schema
