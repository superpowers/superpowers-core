module.exports = dialogs =
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
    buttonsElt.appendChild cancelButtonElt

    validateButtonElt = document.createElement "button"
    validateButtonElt.innerHTML = validationLabel
    validateButtonElt.className = "validate-button"
    validateButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      document.removeEventListener "keyup", onKeyUp
      value = if inputElt.value != "" then inputElt.value else null
      callback?(value)
      return
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

    cancelButtonElt = document.createElement "button"
    cancelButtonElt.innerHTML = "Cancel"
    cancelButtonElt.className = "cancel-button"
    cancelButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      callback?(false)
      return
    buttonsElt.appendChild cancelButtonElt

    validateButtonElt = document.createElement "button"
    validateButtonElt.innerHTML = validationLabel
    validateButtonElt.className = "validate-button"
    validateButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      callback?(true)
      return
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

    messageElt.addEventListener "keypress", (event) =>
      if event.charCode == 13
        document.body.removeChild dialogElt
        value = if selectElt.value != "" then selectElt.value else null
        callback?(value)
      return
    messageElt.appendChild selectElt

    buttonsElt = document.createElement "div"
    buttonsElt.className = "buttons"
    messageElt.appendChild buttonsElt

    cancelButtonElt = document.createElement "button"
    cancelButtonElt.innerHTML = "Cancel"
    cancelButtonElt.className = "cancel-button"
    cancelButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      callback?(null)
      return
    buttonsElt.appendChild cancelButtonElt

    validateButtonElt = document.createElement "button"
    validateButtonElt.innerHTML = validationLabel
    validateButtonElt.className = "validate-button"
    validateButtonElt.addEventListener "click", =>
      document.body.removeChild dialogElt
      value = if selectElt.value != "" then selectElt.value else null
      callback?(value)
      return
    buttonsElt.appendChild validateButtonElt

    document.body.appendChild dialogElt
    selectElt.focus()
    return