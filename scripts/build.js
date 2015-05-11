var path = require("path");
var fs = require("fs");
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

buildPaths.forEach(function(buildPath) {
  log("Building /" + path.relative(rootPath, buildPath));

  var spawnOptions = { cwd: buildPath, env: process.env, stdio: "inherit" };

  if (fs.existsSync(buildPath + "/package.json")) {
    var result = child_process.spawnSync("npm" + (execSuffix ? ".cmd" : ""), [ "install" ], spawnOptions);
    if (result.status !== 0) errors.push("[" + pluginAuthor + "/" + pluginName + "] npm exited with status code " + result.status);
  }

  if (fs.existsSync(buildPath + "/gulpfile.js")) {
    var result = child_process.spawnSync("gulp" + (execSuffix ? ".cmd" : ""), [], spawnOptions);
    if (result.status !== 0) errors.push("[" + pluginAuthor + "/" + pluginName + "] gulp exited with status code " + result.status);
  }

  console.log("");
});

if (errors.length > 0) {
  log("There were errors:");
  errors.forEach(function(error) {
    console.log(error);
  });
} else log("Build complete.");
