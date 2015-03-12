serverPaths = require './serverPaths'
_ = require 'lodash'

config = require '../../../server/configDefaults'
schemas = require '../../../server/schemas'

fs = nodeRequire 'fs'
if fs.existsSync serverPaths.config
  userConfig = JSON.parse fs.readFileSync(serverPaths.config, encoding: 'utf8')
  try schemas.validate userConfig, 'config'
  catch then userConfig = {}
  _.merge config, userConfig

portInput = document.querySelector('input.server-port')
passwordInput = document.querySelector('input.server-password')
maxRecentBuildsInput = document.querySelector('input.max-recent-builds')

portInput.value = config.port
passwordInput.value = config.password
maxRecentBuildsInput.value = config.maxRecentBuilds

document.querySelector('button.save-settings').addEventListener 'click', (event) ->
  config.port = parseInt(portInput.value)
  config.password = passwordInput.value
  config.maxRecentBuilds = parseInt(maxRecentBuildsInput.value)

  fs.writeFileSync serverPaths.config, JSON.stringify(config, null, 2)
  return
