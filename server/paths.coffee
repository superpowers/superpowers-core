path = require 'path'

exports.userData = path.join(__dirname, '..')

switch process.platform
  when "win32"
    if process.env.APPDATA? then exports.userData = path.join(process.env.APPDATA, 'Superpowers')
  when "darwin"
    if process.env.HOME? then exports.userData = path.join(process.env.HOME, 'Library', 'Superpowers')
  else
    if process.env.XDG_DATA_HOME? then exports.userData = path.join(process.env.XDG_DATA_HOME, 'Superpowers')
    else if process.env.HOME? then exports.userData = path.join(process.env.HOME, '.local/share', 'Superpowers')
