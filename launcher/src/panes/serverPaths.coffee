path = nodeRequire 'path'
fs = nodeRequire 'fs'

rootPath = path.resolve(path.dirname(nodeProcess.execPath))

# User data folder
exports.userData = path.join(rootPath, '../..')

switch nodeProcess.platform
  when "win32"
    if nodeProcess.env.APPDATA? then exports.userData = path.join(nodeProcess.env.APPDATA, 'Superpowers')
  when "darwin"
    if nodeProcess.env.HOME? then exports.userData = path.join(nodeProcess.env.HOME, 'Library', 'Superpowers')
  else
    if nodeProcess.env.XDG_DATA_HOME? then exports.userData = path.join(nodeProcess.env.XDG_DATA_HOME, 'Superpowers')
    else if nodeProcess.env.HOME? then exports.userData = path.join(nodeProcess.env.HOME, '.local/share', 'Superpowers')

# Config file
exports.config = path.join rootPath, '../../config.json'
if ! fs.existsSync(exports.config)
  exports.config = path.join exports.userData, 'config.json'
