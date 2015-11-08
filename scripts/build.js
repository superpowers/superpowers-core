var path = require("path");
var fs = require("fs");
var async = require("async");
var child_process = require("child_process");

function shouldIgnoreFolder(folderName) { return folderName.indexOf(".") !== -1 || folderName === "node_modules" || folderName === "public"; }

function log(message) {
  var text = new Date().toISOString() + " - " + message;
  console.log(text);
}

// Core and system
var rootPath = path.resolve(__dirname + "/..");

var buildPaths = [
  rootPath,
  rootPath + "/SupCore",
  rootPath + "/SupClient",
  rootPath + "/server",
  rootPath + "/client",
  rootPath + "/launcher",
];

// Systems and plugins
var systemsPath = rootPath + "/systems";
fs.readdirSync(systemsPath).forEach(function(systemName) {
  if (shouldIgnoreFolder(systemName)) return;

  var systemPath = systemsPath + "/" + systemName;
  fs.readdirSync(systemPath).forEach(function(systemFolder) {
    if (shouldIgnoreFolder(systemFolder) || systemFolder === "plugins") return;
    buildPaths.push(systemPath + "/" + systemFolder);
  });

  var systemPluginsPath = systemPath + "/plugins";
  fs.readdirSync(systemPluginsPath).forEach(function(pluginAuthor) {
    if (shouldIgnoreFolder(pluginAuthor)) return;

    var pluginAuthorPath = systemPluginsPath + "/" + pluginAuthor;
    fs.readdirSync(pluginAuthorPath).forEach(function(pluginName) {
      if (shouldIgnoreFolder(pluginName)) return;
      buildPaths.push(pluginAuthorPath + "/" + pluginName);
    });
  });
});

// Filter
if (process.argv.length > 2) {
  var filter = process.argv[2];
  var oldPathCount = buildPaths.length;
  buildPaths = buildPaths.filter(function(buildPath) { return path.relative(rootPath, buildPath).toLowerCase().indexOf(filter.toLowerCase()) !== -1; });
  log("Rebuilding \"" + filter + "\", leaving out " + (oldPathCount - buildPaths.length) + " paths");
}

// Build
var execSuffix = process.platform == "win32";
var errors = [];

log("Build paths: " + buildPaths.map(function(buildPath) { return path.sep + path.relative(rootPath, buildPath); }).join(", "));

var progress = 0;
async.eachSeries(buildPaths, function(buildPath, callback) {
  log("Building " + path.sep + path.relative(rootPath, buildPath) + " (" + (++progress) + "/" + buildPaths.length + ")");

  var spawnOptions = { cwd: buildPath, env: process.env, stdio: "inherit" };

  async.series([

    function(cb) {
      if (!fs.existsSync(buildPath + "/package.json")) { cb(); return; }

      var npm = child_process.spawn("npm" + (execSuffix ? ".cmd" : ""), [ "install" ], spawnOptions);

      npm.on("close", function(status) {
        if (status !== 0) errors.push("[" + buildPath + "] npm exited with status code " + status);
        cb();
      });
    },

    function(cb) {
      if (!fs.existsSync(buildPath + "/gulpfile.js")) { cb(); return; }

      var gulp = child_process.spawn("gulp" + (execSuffix ? ".cmd" : ""), [], spawnOptions);

      gulp.on("close", function(status) {
        if (status !== 0) errors.push("[" + buildPath + "] gulp exited with status code " + status);
        cb();
      });
    }

  ], callback);
}, function() {
  console.log("");

  if (errors.length > 0) {
    log("There were errors:");
    errors.forEach(function(error) {
      console.log(error);
    });
  } else log("Build complete.");
});
