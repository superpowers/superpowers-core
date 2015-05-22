var path = require("path");
var fs = require("fs");
var async = require("async");
var child_process = require("child_process");

function shouldIgnoreFolder(pluginName) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }

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
  rootPath + "/SupAPI",
  rootPath + "/server",
  rootPath + "/system/SupEngine",
  rootPath + "/system/SupRuntime",
  rootPath + "/system/player",
  rootPath + "/client",
  rootPath + "/launcher",
];

// Plugins
var rootPluginsPath = path.resolve(__dirname + "/../plugins");
fs.readdirSync(rootPluginsPath).forEach(function(pluginAuthor) {
  if (shouldIgnoreFolder(pluginAuthor)) return;

  var pluginAuthorPath = rootPluginsPath + "/" + pluginAuthor;
  fs.readdirSync(pluginAuthorPath).forEach(function(pluginName) {
    if (shouldIgnoreFolder(pluginName)) return;
    buildPaths.push(pluginAuthorPath + "/" + pluginName);
  });
});

// Build
var execSuffix = process.platform == "win32";
var errors = [];

async.eachSeries(buildPaths, function(buildPath, callback) {
  log("Building /" + path.relative(rootPath, buildPath));

  var spawnOptions = { cwd: buildPath, env: process.env, stdio: "inherit" };

  async.series([

    function(cb) {
      if (!fs.existsSync(buildPath + "/package.json")) { cb(); return; }

      var npm = child_process.spawn("npm" + (execSuffix ? ".cmd" : ""), [ "install" ], spawnOptions);

      npm.on("close", function(status) {
        if (status !== 0) errors.push("[" + pluginAuthor + "/" + pluginName + "] npm exited with status code " + status);
        cb();
      });
    },

    function(cb) {
      if (!fs.existsSync(buildPath + "/gulpfile.js")) { cb(); return; }

      var gulp = child_process.spawn("gulp" + (execSuffix ? ".cmd" : ""), [], spawnOptions);

      gulp.on("close", function(status) {
        if (status !== 0) errors.push("[" + pluginAuthor + "/" + pluginName + "] gulp exited with status code " + status);
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
