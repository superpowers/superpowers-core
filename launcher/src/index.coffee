require('./panes')
require('./myServer')
config = require('./config')

gui = global.window.nwDispatcher.requireNwGui()
nwWindow = gui.Window.get()
# nwWindow.showDevTools()

# Closing the window
nwWindow.on 'close', (event) ->
  return if config.hasRequestedClose
  config.hasRequestedClose = true
  config.save()

  if serverProcess? then serverProcess.send('stop')
  else nwWindow.close(true)
  return
