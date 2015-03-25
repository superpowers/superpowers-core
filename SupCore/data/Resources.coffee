SupData = require './'
path = require 'path'

# Plugin resources are assets managed by plugins outside the project's asset tree
# They might be used for project-wide plugin-specific settings for instance
module.exports = class Resources extends SupData.base.Dictionary

  constructor: (@server, @resourceClassesById) ->
    super()

  acquire: (id, owner, callback) ->
    if ! SupData.resourceClasses[id]? then callback "Invalid resource id: #{id}"; return

    super id, owner, callback

  _load: (id) ->
    resourceClass = SupData.resourceClasses[id]

    resource = new resourceClass null, @server.data
    resource.load path.join(@server.projectPath, "resources/#{id}")

    resource
