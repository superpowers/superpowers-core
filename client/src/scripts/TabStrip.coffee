{ EventEmitter } = require('events')

module.exports = class TabStrip extends EventEmitter

  constructor: (container) ->
    super()

    @tabsRoot = document.createElement 'ol'
    @tabsRoot.classList.add 'tab-strip'
    container.appendChild @tabsRoot

    @tabsRoot.addEventListener 'mousedown', @_onTabMouseDown
    @tabsRoot.addEventListener 'click', @_onTabClick

  _onTabClick: (event) =>
    # Only handle middle-click and ignore clicks outside any tab
    return if event.button != 1 or event.target.parentElement != @tabsRoot

    tabElement = event.target
    @emit 'closeTab', tabElement
    return

  _onTabMouseDown: (event) =>
    # Only handle left-click
    return if event.button != 0 or event.target.parentElement != @tabsRoot

    tabElement = event.target
    @emit 'activateTab', tabElement

    # Tab reordering
    tabRect = tabElement.getBoundingClientRect()
    leftOffsetFromMouse = tabRect.left - event.clientX
    hasDragged = false

    tabElement.classList.add 'dragged'

    # FIXME: Hard-coded border?
    tabElement.style.width = "#{tabRect.width + 1}px"

    # NOTE: set/releaseCapture aren't supported in Chrome yet
    # hence the conditional call
    tabElement.setCapture?()

    tabPlaceholderElement = document.createElement 'li'
    tabPlaceholderElement.className = 'drop-placeholder'
    tabElement.parentElement.insertBefore tabPlaceholderElement, tabElement.nextSibling

    updateDraggedTab = (clientX) =>
      tabsRootRect = @tabsRoot.getBoundingClientRect()

      tabLeft = Math.max Math.min( clientX + leftOffsetFromMouse, tabsRootRect.right - tabRect.width ), tabsRootRect.left
      if hasDragged or Math.abs(tabLeft - tabRect.left) >= 10
        hasDragged = true
      else
        tabLeft = tabRect.left

      tabElement.style.left = "#{tabLeft}px"

      if tabLeft < tabPlaceholderElement.getBoundingClientRect().left
        otherTabElement = tabPlaceholderElement
        while true
          otherTabElement = tabPlaceholderElement.previousSibling
          otherTabElement = otherTabElement.previousSibling if otherTabElement == tabElement
          break if ! otherTabElement?

          otherTabCenter = otherTabElement.getBoundingClientRect().left + otherTabElement.getBoundingClientRect().width / 2
          break if otherTabCenter < tabLeft

          otherTabElement.parentElement.insertBefore tabPlaceholderElement, otherTabElement
      else
        otherTabElement = tabPlaceholderElement
        while true
          otherTabElement = tabPlaceholderElement.nextSibling
          otherTabElement = otherTabElement.nextSibling if otherTabElement == tabElement
          break if ! otherTabElement?

          otherTabCenter = otherTabElement.getBoundingClientRect().left + otherTabElement.getBoundingClientRect().width / 2
          break if tabLeft + tabRect.width < otherTabCenter

          otherTabElement.parentElement.insertBefore tabPlaceholderElement, otherTabElement.nextSibling

      if tabPlaceholderElement.nextSibling == tabElement
        tabElement.parentElement.insertBefore tabPlaceholderElement, tabElement.nextSibling
      return

    onDragTab = (event) => updateDraggedTab event.clientX

    onDropTab = (event) =>
      # NOTE: set/releaseCapture aren't supported in Chrome yet
      # hence the conditional call
      tabElement.releaseCapture?()

      if tabPlaceholderElement.parentElement?
        @tabsRoot.replaceChild tabElement, tabPlaceholderElement
      else
        @tabsRoot.appendChild tabElement

      tabElement.classList.remove 'dragged'
      tabElement.style.left = ''
      tabElement.style.width = ''

      document.removeEventListener 'mousemove', onDragTab
      document.removeEventListener 'mouseup', onDropTab

    updateDraggedTab event.clientX
    document.addEventListener 'mousemove', onDragTab
    document.addEventListener 'mouseup', onDropTab
