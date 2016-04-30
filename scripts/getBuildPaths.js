var path = require("path");
var fs = require("fs");

function shouldIgnoreFolder(folderName) { return folderName.indexOf(".") !== -1 || folderName === "node_modules" || folderName === "public"; }
var builtInFolderAuthors = [ "default", "common", "extra" ];

module.exports = function(rootPath) {
  var buildPaths = [
    rootPath,
    rootPath + "/SupCore",
    rootPath + "/SupClient",
    rootPath + "/server",
    rootPath + "/client"
  ];

  // Systems and plugins
  var systemsPath = rootPath + "/systems";
  var systemFolders = [];
  try { systemFolders = fs.readdirSync(systemsPath); } catch (err) { /* Ignore */ }
  systemFolders.forEach(function(systemName) {
    if (shouldIgnoreFolder(systemName)) return;

    var systemPath = systemsPath + "/" + systemName;

    var isDevFolder = true;
    try { fs.readdirSync(systemPath + "/" + ".git"); } catch (err) { isDevFolder = false; }
    if (!isDevFolder) return;

    fs.readdirSync(systemPath).forEach(function(systemFolder) {
      if (shouldIgnoreFolder(systemFolder) || systemFolder === "plugins") return;
      buildPaths.push(systemPath + "/" + systemFolder);
    });

    var systemPluginsPath = systemPath + "/plugins";
    if (!fs.existsSync(systemPluginsPath)) return;

    fs.readdirSync(systemPluginsPath).forEach(function(pluginAuthor) {
      if (shouldIgnoreFolder(pluginAuthor)) return;

      var pluginAuthorPath = systemPluginsPath + "/" + pluginAuthor;
      fs.readdirSync(pluginAuthorPath).forEach(function(pluginName) {
        if (shouldIgnoreFolder(pluginName)) return;
        
        var pluginPath = pluginAuthorPath + "/" + pluginName;

        if (builtInFolderAuthors.indexOf(pluginAuthor) === -1) {
          var isDevFolder = true;
          try { fs.readdirSync(pluginPath + "/" + ".git"); } catch (err) { isDevFolder = false; }
          if (!isDevFolder) return;
        }

        buildPaths.push(pluginPath);
      });
    });
  });

  return buildPaths;
}
