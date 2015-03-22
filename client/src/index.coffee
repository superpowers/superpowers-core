hub = require './scripts/hub'
project = require './scripts/project'

qs = require('querystring').parse window.location.search.slice(1)

if qs.project? then project qs.project
else hub()

if window.nwDispatcher?
  gui = window.nwDispatcher.requireNwGui()
  win = gui.Window.get()

  win.on 'maximize', -> document.body.classList.add 'maximized'; return
  win.on 'unmaximize', -> document.body.classList.remove 'maximized'; return

  onMinimizeWindowClick = -> win.minimize(); return

  onMaximizeWindowClick = ->
    maximized = screen.availHeight <= win.height
    document.body.classList.toggle 'maximized', ! maximized
    if maximized then win.unmaximize() else win.maximize()
    return

  onCloseWindowClick = -> window.close(); return

  document.querySelector('.controls .minimize').addEventListener 'click', onMinimizeWindowClick
  document.querySelector('.controls .maximize').addEventListener 'click', onMaximizeWindowClick
  document.querySelector('.controls .close').addEventListener 'click', onCloseWindowClick

  document.querySelector('a.superpowers')?.addEventListener 'click', (event) ->
    event.preventDefault()
    gui.Shell.openExternal event.target.href
    return

else
  document.body.classList.add 'browser'
