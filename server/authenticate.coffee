config = require './config'

usernameRegex = /^[A-Za-z0-9_]{3,20}$/

module.exports = (socket, next) ->
  if socket.handshake.query?
    authJSON = socket.handshake.query.supServerAuth
    try auth = JSON.parse(authJSON)

  if auth? and auth.serverPassword == config.password and typeof auth.username == 'string' and usernameRegex.test(auth.username)
    socket.username = auth.username

  if ! socket.username?
    if config.password.length > 0 then next new Error('invalidCredentials'); return
    else next new Error('invalidUsername'); return
  next(); return
