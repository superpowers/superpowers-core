var path = require("path");
var fs = require("fs");
var child_process = require("child_process");

function shouldIgnoreFolder(pluginName) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }

function log(message) {
  var text = new Date().toISOString() + " - " + message;
  console.log(text);
}

var rootPluginsPath = path.resolve(__dirname + "/../plugins");
var execSuffix = process.platform == "win32";

var errors = [];

var pluginAuthors = fs.readdirSync(rootPluginsPath);
pluginAuthors.forEach(function(pluginAuthor) {
  if (shouldIgnoreFolder(pluginAuthor)) return;

  var pluginAuthorPath = rootPluginsPath + "/" + pluginAuthor;
  var pluginNames = fs.readdirSync(pluginAuthorPath);
  pluginNames.forEach(function(pluginName) {
    if (shouldIgnoreFolder(pluginName)) return;

    log("Building " + pluginAuthor + "/" + pluginName);

    var pluginPath = pluginAuthorPath + "/" + pluginName;
    var spawnOptions = { cwd: pluginPath, env: process.env, stdio: "inherit" };

    if (fs.existsSync(pluginPath + "/package.json")) {
      var result = child_process.spawnSync("npm" + (execSuffix ? ".cmd" : ""), [ "install" ], spawnOptions);
      if (result.status !== 0) errors.push("[" + pluginAuthor + "/" + pluginName + "] npm exited with status code " + result.status);
    }

    if (fs.existsSync(pluginPath + "/gulpfile.js")) {
      var result = child_process.spawnSync("gulp" + (execSuffix ? ".cmd" : ""), [], spawnOptions);
      if (result.status !== 0) errors.push("[" + pluginAuthor + "/" + pluginName + "] gulp exited with status code " + result.status);
    }

    console.log("");
  });
});

if (errors.length > 0) {
  log("There were errors building plugins:");
  errors.forEach(function(error) {
    console.log(error);
  });
} else log("No errors building plugins.");
