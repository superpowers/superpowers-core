gui = global.window.nwDispatcher.requireNwGui()
packageInfo = require('../../../package.json')

splash = document.querySelector('.splash');

splash.addEventListener 'click', (event) ->
  if event.target.tagName == 'A'
    event.preventDefault()
    gui.Shell.openExternal event.target.href
    return

  return if event.target != splash
  splash.parentElement.removeChild splash
  return

# Check for new releases
document.querySelector('.splash .version').textContent = "v#{packageInfo.version}"
updateStatus = document.querySelector('.splash .update-status')

xhr = new XMLHttpRequest
xhr.open 'GET', "http://sparklinlabs.com/releases.json", true
xhr.responseType = 'json'

xhr.onload = (event) ->
  if xhr.status != 200
    updateStatus.textContent = "Failed to check for updates."
    return

  if xhr.response[0].version == packageInfo.version
    updateStatus.textContent = ""
  else
    updateStatus.innerHTML = "UPDATE: v#{xhr.response[0].version} is available. <a href='https://sparklinlabs.com/account' target='_blank'>Download it now</a>."
  return

xhr.send()
