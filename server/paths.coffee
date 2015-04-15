path = require 'path'
fs = require 'fs'

argv = require('yargs')
  .describe('data-path', 'Path to store/read data files from, including config and projects')
  .argv

# User data folder
exports.userData = path.join(__dirname, '..')

if argv['data-path']?
  exports.userData = path.resolve argv['data-path']
else
  switch process.platform
    when "win32"
      if process.env.APPDATA? then exports.userData = path.join(process.env.APPDATA, 'Superpowers')
    when "darwin"
      if process.env.HOME? then exports.userData = path.join(process.env.HOME, 'Library', 'Superpowers')
    else
      if process.env.XDG_DATA_HOME? then exports.userData = path.join(process.env.XDG_DATA_HOME, 'Superpowers')
      else if process.env.HOME? then exports.userData = path.join(process.env.HOME, '.local/share', 'Superpowers')

# Projects folder
exports.projects = path.join(__dirname, "../projects")

if argv['data-path']? or ! fs.existsSync(exports.projects)
  exports.projects = path.join(exports.userData, "projects")
  try fs.mkdirSync exports.userData
  try fs.mkdirSync exports.projects

# Config file
exports.config = path.join __dirname, '../config.json'
if argv['data-path']? or ! fs.existsSync(exports.config)
  exports.config = path.join exports.userData, 'config.json'
