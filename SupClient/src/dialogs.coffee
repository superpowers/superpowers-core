fuzzy = require "fuzzy"

module.exports =
  prompt: (label, placeholder, initialValue, validationLabel, callback) ->
    dialogElt = document.createElement "div"
    dialogElt.className = "dialog"

    messageElt = document.createElement "div"
    messageElt.className = "message"
    dialogElt.appendChild messageElt

    labelElt = document.createElement "label"
    labelElt.innerHTML = label
    messageElt.appendChild labelElt

    inputElt = document.createElement "input"
    inputElt.placeholder = placeholder ? ""
    inputElt.value = initialValue ? ""

    onKeyUp = (event) =>
      if event.keyCode == 13
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        value = if inputElt.value != "" then inputElt.value else null
        callback?(value)
      else if event.keyCode == 27
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        callback?(null)
      return

    document.addEventListener "keyup", onKeyUp
    messageElt.appendChild inputElt

    buttonsElt = document.createElement "div"
    buttonsElt.className = "buttons"
    messageElt.appendChild buttonsElt

    cancelButtonElt = document.createElement "button"
    cancelButtonElt.innerHTML = "Cancel"
    cancelButtonElt.className = "cancel-button"
    cancelButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      document.removeEventListener "keyup", onKeyUp
      callback?(null)
      return

    validateButtonElt = document.createElement "button"
    validateButtonElt.innerHTML = validationLabel
    validateButtonElt.className = "validate-button"
    validateButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      document.removeEventListener "keyup", onKeyUp
      value = if inputElt.value != "" then inputElt.value else null
      callback?(value)
      return

    if navigator.platform == "Win32"
      buttonsElt.appendChild validateButtonElt
      buttonsElt.appendChild cancelButtonElt
    else
      buttonsElt.appendChild cancelButtonElt
      buttonsElt.appendChild validateButtonElt

    document.body.appendChild dialogElt
    inputElt.select()
    return

  confirm: (label, validationLabel, callback) ->
    dialogElt = document.createElement "div"
    dialogElt.className = "dialog"

    messageElt = document.createElement "div"
    messageElt.className = "message"
    dialogElt.appendChild messageElt

    labelElt = document.createElement "label"
    labelElt.innerHTML = label
    messageElt.appendChild labelElt

    buttonsElt = document.createElement "div"
    buttonsElt.className = "buttons"
    messageElt.appendChild buttonsElt

    onKeyUp = (event) =>
      if event.keyCode == 13
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        callback?(true)
      else if event.keyCode == 27
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        callback?(false)
      return

    document.addEventListener "keyup", onKeyUp

    cancelButtonElt = document.createElement "button"
    cancelButtonElt.innerHTML = "Cancel"
    cancelButtonElt.className = "cancel-button"
    cancelButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      document.removeEventListener "keyup", onKeyUp
      callback?(false)
      return

    validateButtonElt = document.createElement "button"
    validateButtonElt.innerHTML = validationLabel
    validateButtonElt.className = "validate-button"
    validateButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      document.removeEventListener "keyup", onKeyUp
      callback?(true)
      return

    if navigator.platform == "Win32"
      buttonsElt.appendChild validateButtonElt
      buttonsElt.appendChild cancelButtonElt
    else
      buttonsElt.appendChild cancelButtonElt
      buttonsElt.appendChild validateButtonElt

    document.body.appendChild dialogElt
    validateButtonElt.focus()
    return

  info: (label, validationLabel, callback) ->
    dialogElt = document.createElement "div"
    dialogElt.className = "dialog"

    messageElt = document.createElement "div"
    messageElt.className = "message"
    dialogElt.appendChild messageElt

    labelElt = document.createElement "label"
    labelElt.innerHTML = label
    messageElt.appendChild labelElt

    buttonsElt = document.createElement "div"
    buttonsElt.className = "buttons"
    messageElt.appendChild buttonsElt

    validateButtonElt = document.createElement "button"
    validateButtonElt.innerHTML = validationLabel
    validateButtonElt.className = "validate-button"
    validateButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      callback?()
      return
    buttonsElt.appendChild validateButtonElt

    document.body.appendChild dialogElt
    validateButtonElt.focus()
    return

  select: (label, list, validationLabel, callback) ->
    dialogElt = document.createElement "div"
    dialogElt.className = "dialog"

    messageElt = document.createElement "div"
    messageElt.className = "message"
    dialogElt.appendChild messageElt

    labelElt = document.createElement "label"
    labelElt.innerHTML = label
    messageElt.appendChild labelElt

    selectElt = document.createElement "select"
    for option in list
      optionElt = document.createElement "option"
      optionElt.innerHTML = option
      selectElt.appendChild optionElt

    onKeyUp = (event) =>
      if event.keyCode == 13
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        value = if selectElt.value != "" then selectElt.value else null
        callback?(value)
      else if event.keyCode == 27
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        callback?(null)
      return

    document.addEventListener "keyup", onKeyUp
    messageElt.appendChild selectElt

    buttonsElt = document.createElement "div"
    buttonsElt.className = "buttons"
    messageElt.appendChild buttonsElt

    cancelButtonElt = document.createElement "button"
    cancelButtonElt.innerHTML = "Cancel"
    cancelButtonElt.className = "cancel-button"
    cancelButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      document.removeEventListener "keyup", onKeyUp
      callback?(null)
      return

    validateButtonElt = document.createElement "button"
    validateButtonElt.innerHTML = validationLabel
    validateButtonElt.className = "validate-button"
    validateButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      document.removeEventListener "keyup", onKeyUp
      value = if selectElt.value != "" then selectElt.value else null
      callback?(value)
      return

    if navigator.platform == "Win32"
      buttonsElt.appendChild validateButtonElt
      buttonsElt.appendChild cancelButtonElt
    else
      buttonsElt.appendChild cancelButtonElt
      buttonsElt.appendChild validateButtonElt

    document.body.appendChild dialogElt
    selectElt.focus()
    return

  filter: (list, placeholder, callback) ->
    dialogElt = document.createElement "div"
    dialogElt.className = "dialog"

    messageElt = document.createElement "div"
    messageElt.className = "message"
    dialogElt.appendChild messageElt

    inputElt = document.createElement "input"
    inputElt.placeholder = placeholder ? ""
    messageElt.appendChild inputElt

    labelParentElt = document.createElement "div"
    labelParentElt.className = "filter-parent"
    messageElt.appendChild labelParentElt

    labelElts = []
    selectedIndex = null

    selectResult = (index) =>
      selectedIndex = index
      labelElts[index].className = "selected"
      labelParentElt.scrollTop = (index - 3) * 20
      return

    onKeyDown = (event) =>
      if event.keyCode == 38
        event.preventDefault()
        if selectedIndex? and selectedIndex > 0
          labelElts[selectedIndex].className = ""
          selectResult selectedIndex - 1

      else if event.keyCode == 40
        event.preventDefault()
        if selectedIndex? and selectedIndex < labelElts.length - 1
          labelElts[selectedIndex].className = ""
          selectResult selectedIndex + 1
      return

    onKeyUp = (event) =>
      if event.keyCode == 13
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        document.removeEventListener "keydown", onKeyDown
        value = if selectedIndex? then labelElts[selectedIndex].innerHTML else null
        callback?(value)

      else if event.keyCode == 27
        document.body.removeChild dialogElt
        document.removeEventListener "keyup", onKeyUp
        document.removeEventListener "keydown", onKeyDown
        callback?(null)

      else if inputElt.value != ""
        previousSelectedResult = if selectedIndex? then labelElts[selectedIndex].innerHTML else null

        results = fuzzy.filter inputElt.value, list
        for result, index in results
          if ! labelElts[index]?
            labelElt = document.createElement "div"
            labelElt.innerHTML = results[index].original
            labelParentElt.appendChild labelElt
            labelElts.push labelElt
          else
            labelElts[index].className = ""
            labelElts[index].innerHTML = results[index].original

          if results[index].original == previousSelectedResult
            newSelectedIndex = index

        while labelElts.length > results.length
          labelParentElt.removeChild labelElts[labelElts.length - 1]
          labelElts.pop()

        if newSelectedIndex?
          selectResult newSelectedIndex
        else if labelElts[0]?
          selectResult 0
        else
          selectedIndex = null

      else
        labelParentElt.removeChild labelElt for labelElt in labelElts
        labelElts.length = 0
        selectedIndex = null
      return

    document.addEventListener "keydown", onKeyDown, true
    document.addEventListener "keyup", onKeyUp

    document.body.appendChild dialogElt
    inputElt.focus()
    return
