var path = require("path");
var fs = require("fs");
var getBuildPaths = require("./getBuildPaths");

var rootPath = path.resolve(__dirname + "/..");

var systemsDirectoryExists = false;
try { if (fs.statSync(rootPath + "/systems").isDirectory) systemsDirectoryExists = true; } catch(err) {}

var oldSystemDirectoryExists = false;
try { if (fs.statSync(rootPath + "/system").isDirectory) oldSystemDirectoryExists = true; } catch(err) {}

if (!systemsDirectoryExists && oldSystemDirectoryExists) {
  console.log("IMPORTANT: Superpowers now supports multiple systems, many things have moved.");
  console.log("The system/ and plugins/ folders have moved respectively to systems/supGame/ and system/supGame/plugins/.");
  console.log("The repositories have also been renamed to sup-game-system and sup-game-sparklinlabs-plugins.");
  console.log("");
  console.log("The simplest approach is probably to do a fresh bootstrap from https://sparklinlabs.com/account to avoid any potential issues with left-over build files.");
  console.log("As always, make sure to backup your projects and plugins!");
  process.exit(1);
}

var async = require("async");
var child_process = require("child_process");

function log(message) {
  var text = new Date().toISOString() + " - " + message;
  console.log(text);
}

var buildPaths = getBuildPaths(rootPath);

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

  async.waterfall([

    function (cb) {
      if (!fs.existsSync(buildPath + "/package.json")) { cb(null, null); return; }
      var packageJSON = require(buildPath + "/package.json");
      cb(null, packageJSON);
    },

    function(packageJSON, cb) {
      // Skip if the package doesn't need to be installed
      if (packageJSON == null || packageJSON.dependencies == null && packageJSON.devDependencies == null) {
        if (packageJSON == null || packageJSON.scripts == null ||
        (packageJSON.scripts.preinstall == null &&
        packageJSON.scripts.install == null &&
        packageJSON.scripts.postinstall == null)) {
          cb(null, packageJSON);
          return;
        }
      }

      var npm = child_process.spawn("npm" + (execSuffix ? ".cmd" : ""), [ "install" ], spawnOptions);

      npm.on("close", function(status) {
        if (status !== 0) errors.push("[" + buildPath + "] `npm install` exited with status code " + status);
        cb(null, packageJSON);
      });
    },

    function(packageJSON, cb) {
      // Check if the package has a build script
      if (buildPath !== rootPath && packageJSON != null && packageJSON.scripts != null && packageJSON.scripts.build != null) {
        var npm = child_process.spawn("npm" + (execSuffix ? ".cmd" : ""), [ "run", "build" ], spawnOptions);
  
        npm.on("close", function(status) {
          if (status !== 0) errors.push("[" + buildPath + "] `npm run build` exited with status code " + status);
          cb();
        });
        return;
      }

      // Check if the package has a gulpfile instead
      if (fs.existsSync(buildPath + "/gulpfile.js")) {
        var gulp = child_process.spawn("gulp" + (execSuffix ? ".cmd" : ""), [], spawnOptions);

        gulp.on("close", function(status) {
          if (status !== 0) errors.push("[" + buildPath + "] gulp exited with status code " + status);
          cb();
        });
        return;
      }

      cb();
      return;
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
