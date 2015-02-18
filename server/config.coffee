_ = require 'lodash'
path = require 'path'
fs = require 'fs'
schemas = require './schemas'

module.exports =
  maxRecentBuilds: 50
  port: 80

configFilename = path.join __dirname, '../config.json'
if fs.existsSync(configFilename)
  config = JSON.parse(fs.readFileSync(configFilename, encoding: 'utf8'))
  schemas.validate config, 'config'
  _.merge module.exports, config
