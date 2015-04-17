fs = require 'fs'
path = require 'path'
readdirRecursive = require 'recursive-readdir'
mkdirp = require 'mkdirp'
_ = require 'lodash'

sourceRootPath = path.resolve("#{__dirname}/..")

packageInfo = require("#{sourceRootPath}/package.json")
targetRootPath = "#{__dirname}/../../releases/#{packageInfo.version}/content"
try
  mkdirp targetRootPath
catch e
  console.log "Could not create superpowers-#{packageInfo.version} folder"
  return

shouldDistribute = (file) ->
  file = file.substring(sourceRootPath.length + 1).replace(/\\/g, '/')
  return false if file.indexOf('.hg') != -1
  return false if file.indexOf('.sublime-') != -1
  return false if _.endsWith(file, 'gulpfile.coffee')
  return false if _.endsWith(file, 'launcher.cmd')
  return false if _.endsWith(file, '.orig')
  return false if _.endsWith(file, '.jade')
  return false if _.endsWith(file, '.styl')
  return false if _.endsWith(file, '.ts')
  return false if _.startsWith(file, 'client')
  return false if _.startsWith(file, 'scripts')
  return false if _.startsWith(file, 'projects')
  return false if _.startsWith(file, 'node_modules/browserify')
  return false if _.startsWith(file, 'node_modules/coffeeify')
  return false if _.startsWith(file, 'node_modules/watchify')
  return false if _.startsWith(file, 'node_modules/gulp')
  return false if _.startsWith(file, 'node_modules/.bin')
  return false if _.startsWith(file, 'launcher/src')
  return false if _.startsWith(file, 'bin')
  return false if _.startsWith(file, 'public/builds') or _.startsWith(file, 'projects')
  return false if file == 'config.json'
  true

readdirRecursive sourceRootPath, (err, files) ->
  if err? then console.log(err); return

  files = _.filter files, shouldDistribute

  for file in files
    relativeFile = file.substring sourceRootPath.length + 1
    targetPath = "#{targetRootPath}/app/#{relativeFile}"
    mkdirp.sync path.dirname(targetPath)
    fs.writeFileSync targetPath, fs.readFileSync file

  fs.renameSync "#{targetRootPath}/app/launcher/public/package.json", "#{targetRootPath}/package.json"
  launcherPackage = fs.readFileSync "#{targetRootPath}/package.json", { encoding: 'utf8' }
  launcherPackage = launcherPackage.replace "index.html", "app/launcher/public/index.html"
  launcherPackage = launcherPackage.replace "node-main.js", "app/launcher/public/node-main.js"
  launcherPackage = launcherPackage.replace "icon.png", "app/launcher/public/icon.png"
  fs.writeFileSync "#{targetRootPath}/package.json", launcherPackage, { encoding: 'utf8' }
  return
