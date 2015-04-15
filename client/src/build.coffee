nodeRequire = require

window.addEventListener "message", (event) ->
  return if event.data.type != "save"
  return if ! event.data.outputFolder?

  document.title = "Superpowers — Exporting..."
  statusElt = document.querySelector('.status')
  statusElt.textContent = "Exporting..."

  _ = nodeRequire 'lodash'
  async = nodeRequire 'async'
  fs = nodeRequire 'fs'
  path = nodeRequire 'path'
  mkdirp = nodeRequire 'mkdirp'
  toBuffer = nodeRequire 'typedarray-to-buffer'
  nwWindow = nwDispatcher.requireNwGui().Window.get()

  buildPath = "/builds/#{event.data.projectId}/#{event.data.buildId}"

  nwWindow.setProgressBar 0
  progress = 0
  progressMax = event.data.files.length
  async.eachLimit event.data.files, 10, (file, cb) ->
    outputFilename = file
    if _.startsWith(outputFilename, buildPath)
      outputFilename = outputFilename.substr(buildPath.length)
    outputFilename = outputFilename.replace(/\//g, path.sep)

    outputPath = "#{event.data.outputFolder}#{outputFilename}"
    statusElt.textContent = outputPath

    xhr = new XMLHttpRequest
    xhr.open 'GET', file
    xhr.responseType = 'arraybuffer'

    xhr.onload = (event) ->
      if xhr.status != 200 then cb new Error("Failed to download #{file}, got status #{xhr.status}"); return
      mkdirp path.dirname(outputPath), (err) ->
        if err? then cb err; return
        fs.writeFile outputPath, toBuffer(new Uint8Array(xhr.response)).toString('binary'), { encoding: 'binary' }, ->
          progress++
          nwWindow.setProgressBar progress / progressMax
          cb(); return
      return

    xhr.send(); return
  , (err) ->
    nwWindow.setProgressBar -1
    if err? then alert err; return
    # TODO: Add link to open in file browser
    document.title = "Superpowers — Exported"
    statusElt.textContent = "Exported to #{event.data.outputFolder}"
  return
