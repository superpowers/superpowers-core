require './panes'
require './splash'
myServer = require './myServer'
config = require './config'

gui = global.window.nwDispatcher.requireNwGui()
nwWindow = gui.Window.get()
# nwWindow.showDevTools()

document.querySelector('.controls .minimize').addEventListener 'click', -> nwWindow.minimize(); return
document.querySelector('.controls .close').addEventListener 'click', -> nwWindow.close(false); return

# Closing the window
nwWindow.on 'close', (event) ->
  return if config.hasRequestedClose
  config.hasRequestedClose = true
  config.save()

  if myServer.serverProcess? then myServer.serverProcess.send('stop')
  else nwWindow.close(true)
  return
