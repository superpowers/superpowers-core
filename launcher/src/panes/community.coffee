gui = global.window.nwDispatcher.requireNwGui()

document.querySelector('.panes .community').addEventListener 'click', (event) ->
  return if event.target.tagName != 'A'

  event.preventDefault()
  gui.Shell.openExternal event.target.href
  return
