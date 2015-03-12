_ = require 'lodash'
path = require 'path'
fs = require 'fs'
schemas = require './schemas'
paths = require './paths'
module.exports = require './configDefaults'

if fs.existsSync paths.config
  config = JSON.parse fs.readFileSync(paths.config, encoding: 'utf8')
  schemas.validate config, 'config'
  _.merge module.exports, config
