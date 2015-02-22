gui = global.window.nwDispatcher.requireNwGui()
packageInfo = require('../../../package.json')

document.querySelector('.home .version').textContent = "v#{packageInfo.version}"

document.querySelector('.home a.sparklin-labs').addEventListener 'click', (event) ->
  event.preventDefault()
  gui.Shell.openExternal event.target.href
  return
