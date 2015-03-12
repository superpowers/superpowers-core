schemas = {}

# Server config
schemas.config =
  type: 'object'
  properties:
    port: { type: 'number' }
    password: { type: 'string' }
    maxRecentBuilds: { type: 'number', min: 1 }

# Project manifest
schemas.projectManifest =
  type: 'object'
  properties:
    id: { type: 'string', minLength: 4, maxLength: 4 }
    name: { type: 'string', minLength: 1, maxLength: 80 }
    description: { type: 'string', maxLength: 300 }
  required: [ 'id', 'name', 'description' ]

# Project members
schemas.projectMembers =
  type: 'array'
  items:
    type: 'object'
    properties:
      id: { type: 'integer' }
      cachedUsername: { type: 'string' }

# Project entries
projectEntry =
  type: 'object'
  properties:
    id: { type: 'integer' }
    name: { type: 'string', minLength: 1, maxLength: 80 }
    type: { type: [ 'string', 'null' ] }
    children:
      type: 'array',
      items: { $ref: "#/definitions/projectEntry" }
  required: [ 'id', 'name' ]

schemas.projectEntries =
  definitions: { projectEntry }
  type: 'array'
  items: { $ref: "#/definitions/projectEntry" }


tv4 = require 'tv4'
module.exports =

  validate: (obj, schemaName) ->
    schema = schemas[schemaName]
    if ! tv4.validate obj, schema
      throw new Error "#{tv4.error.dataPath} (#{tv4.error.schemaPath}): #{tv4.error.message}"

    true
