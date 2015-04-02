module.exports = component =

  createSetting: (parentElt, name, options) ->
    rowElt = document.createElement('tr')
    parentElt.appendChild rowElt

    keyElt = document.createElement('th')
    rowElt.appendChild keyElt

    if options?.checkbox
      containerElt = document.createElement('div')
      containerElt.className = ''
      keyElt.appendChild containerElt

      nameElt = document.createElement('div')
      nameElt.textContent = name
      nameElt.title = options.title
      containerElt.appendChild nameElt

      checkboxElt = document.createElement('input')
      checkboxElt.type = 'checkbox'
      containerElt.appendChild checkboxElt
    else
      keyElt.textContent = name

    valueElt = document.createElement('td')
    rowElt.appendChild valueElt

    { rowElt, keyElt, valueElt, checkboxElt }

  createTextField: (parentElt, value) ->
    inputElt = document.createElement('input')
    inputElt.type = 'text'
    parentElt.appendChild inputElt

    inputElt.value = value

    inputElt

  createNumberField: (parentElt, value, min, max) ->
    inputElt = document.createElement('input')
    inputElt.type = 'number'
    parentElt.appendChild inputElt

    inputElt.value = value
    inputElt.min = min if min?
    inputElt.max = max if max?

    inputElt

  createBooleanField: (parentElt, value) ->
    inputElt = document.createElement('input')
    inputElt.type = 'checkbox'
    parentElt.appendChild inputElt

    inputElt.checked = value

    inputElt

  createSelectBox: (parentElt, options, initialValue) ->
    selectElt = document.createElement('select')
    parentElt.appendChild selectElt

    component.createSelectOption selectElt, value, label for value, label of options

    selectElt.value = initialValue
    selectElt

  createSelectOption: (parentElt, value, label) ->
    optionElt = document.createElement('option')
    optionElt.value = value
    optionElt.textContent = label
    parentElt.appendChild optionElt

    optionElt
