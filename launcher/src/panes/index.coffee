require('./home')
require('./servers')

# Panes
paneButtonsContainer = document.querySelector('.pane-buttons')
panesContainer = document.querySelector('.panes')

for button, i in paneButtonsContainer.children
  do (i) ->
    button.addEventListener 'click', (event) ->
      paneButtonsContainer.querySelector('button.active').classList.remove 'active'
      panesContainer.querySelector('.active').classList.remove 'active'
      event.target.classList.add 'active'
      panesContainer.children[i].classList.add 'active'
    return

paneButtonsContainer.children[0].classList.add 'active'
panesContainer.children[0].classList.add 'active'
