gui = global.window.nwDispatcher.requireNwGui()
nwWindow = gui.Window.get()
hasRequestedClose = false

nwWindow.on 'close', (event) ->
  return if hasRequestedClose

  hasRequestedClose = true
  if serverProcess? then serverProcess.send('stop')
  else nwWindow.close(true)
  return

textarea = document.querySelector('textarea')
serverProcess = null

startButton = document.querySelector('button.start-server')
stopButton = document.querySelector('button.stop-server')
openButton = document.querySelector('button.open')

startButton.addEventListener 'click', ->
  return if serverProcess?

  startButton.disabled = true
  stopButton.disabled = false

  serverProcess = child_process.fork '../../server/start.js', silent: true
  serverProcess.on 'exit', (chunk) ->
    serverProcess = null
    startButton.disabled = false
    stopButton.disabled = true

    if hasRequestedClose then nwWindow.close(true)
    return

  serverProcess.on 'message', (msg) -> textarea.value += "#{msg}\n"; return
  return

stopButton.addEventListener 'click', ->
  return if ! serverProcess?

  serverProcess.send('stop')
  return

openButton.addEventListener 'click', ->
  return if ! serverProcess?

  window.open("http://localhost")
  return
