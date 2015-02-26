base = require './base'
_ = require 'lodash'

characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

module.exports = class Projects extends base.ListById

  constructor: (pub) ->
    super pub, {
      name: { type: 'string', minLength: 1, maxLength: 80 }
      description: { type: 'string', maxLength: 300 }
    }, @generateProjectId

  generateProjectId: =>
    id = null
    
    loop
      id = _.sample(characters, 4).join ''
      break if ! @byId[id]?

    id
