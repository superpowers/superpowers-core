serversJSON = localStorage.getItem 'superpowers.servers'

# NOTE: This probably doesn't belong in the config
exports.hasRequestedClose = false

exports.serverEntries =
  if serversJSON? then JSON.parse serversJSON
  else [ { name: "My Server", address: "127.0.0.1:4237" } ]

autoStartServer = localStorage.getItem 'superpowers.autoStartServer'
exports.autoStartServer = if autoStartServer? then JSON.parse autoStartServer else true

exports.save = ->
  exports.serverEntries = []
  for liElt in require('./panes/servers').serversTreeView.treeRoot.children
    exports.serverEntries.push { name: liElt.dataset.name, address: liElt.dataset.address}

  localStorage.setItem 'superpowers.servers', JSON.stringify(exports.serverEntries)
  localStorage.setItem 'superpowers.autoStartServer', JSON.stringify(exports.autoStartServer)
