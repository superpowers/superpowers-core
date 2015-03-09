module.exports = component =

  createSetting: (parentElt, name) ->
    rowElt = document.createElement('tr')
    parentElt.appendChild rowElt

    keyElt = document.createElement('th')
    keyElt.textContent = name
    rowElt.appendChild keyElt

    valueElt = document.createElement('td')
    rowElt.appendChild valueElt

    { rowElt, keyElt, valueElt }

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

  createCheckBox: (parentElt, value) ->
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
