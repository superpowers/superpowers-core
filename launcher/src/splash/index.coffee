gui = global.window.nwDispatcher.requireNwGui()
packageInfo = require('../../../package.json')

splash = document.querySelector('.splash');

splash.addEventListener 'click', (event) ->
  return if event.target != splash
  splash.parentElement.removeChild splash
  return

document.querySelector('.splash .version').textContent = "v#{packageInfo.version}"

document.querySelector('.splash a.sparklin-labs').addEventListener 'click', (event) ->
  event.preventDefault()
  gui.Shell.openExternal event.target.href
  return
