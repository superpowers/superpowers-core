config = require '../config'

path = nodeRequire 'path'
child_process = nodeRequire 'child_process'

myServerElt = document.querySelector('.my-server')

myServerTextarea = myServerElt.querySelector('textarea')
serverProcess = null

autoStartServerCheckbox = myServerElt.querySelector('#auto-start-server')
autoStartServerCheckbox.checked = config.autoStartServer

autoStartServerCheckbox.addEventListener 'change', (event) ->
  config.autoStartServer = event.target.checked
  return

startStopServerButton = myServerElt.querySelector('button.start-stop-server')
startStopServerButton.addEventListener 'click', ->
  if serverProcess?
    startStopServerButton.textContent = 'Start'
    startStopServerButton.disabled = true
    serverProcess.send('stop')
    return

  startServer()
  return

startServer = ->
  startStopServerButton.textContent = 'Stop'

  serverPath = path.join path.resolve(path.dirname(nodeProcess.mainModule.filename)), '../../server/start.js'
  serverProcess = child_process.fork serverPath, silent: true
  serverProcess.on 'exit', (chunk) ->
    serverProcess = null
    startStopServerButton.disabled = false
    startStopServerButton.textContent = 'Start'
    myServerTextarea.value += "\n"

    if config.hasRequestedClose then nwWindow.close(true)
    return

  serverProcess.on 'message', (msg) ->
    myServerTextarea.value += "#{msg}\n"
    setTimeout ( -> myServerTextarea.scrollTop = myServerTextarea.scrollHeight ), 0
    return

startServer() if config.autoStartServer
