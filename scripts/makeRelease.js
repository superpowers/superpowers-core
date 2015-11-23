var fs = require("fs");
var path = require("path");
var getBuildPaths = require("./getBuildPaths");
var readdirRecursive = require("recursive-readdir");
var mkdirp = require("mkdirp");
var async = require("async");
var _ = require("lodash");
var child_process = require("child_process");

var sourceRootPath = path.resolve(__dirname + "/..");
var packageInfo = require(sourceRootPath + "/package.json");
var targetRootPath = __dirname + "/../../releases/" + packageInfo.version + "/content";

try { mkdirp(targetRootPath); }
catch (error) { console.log("Could not create superpowers-" + packageInfo.version + " folder"); process.exit(1); }

function shouldDistribute(file) {
  file = file.substring(sourceRootPath.length + 1).replace(/\\/g, "/");
  if (file[0] === "." || file.indexOf("/.") !== -1) return false;
  if (_.endsWith(file, "gulpfile.js") || _.endsWith(file, "tsconfig.json")) return false;
  if (_.endsWith(file, "launcher.cmd")) return false;
  if (_.endsWith(file, ".orig")) return false;
  if (_.endsWith(file, ".jade")) return false;
  if (_.endsWith(file, ".styl")) return false;
  if (_.endsWith(file, ".ts") && file.indexOf("typings/") === -1 && file.indexOf("node_modules/") === -1) return false;
  if (_.startsWith(file, "client")) return false;
  if (_.startsWith(file, "scripts")) return false;
  if (_.startsWith(file, "node_modules/browserify")) return false;
  if (_.startsWith(file, "node_modules/brfs")) return false;
  if (_.startsWith(file, "node_modules/vinyl-source-stream")) return false;
  if (_.startsWith(file, "node_modules/watchify")) return false;
  if (_.startsWith(file, "node_modules/gulp")) return false;
  if (_.startsWith(file, "launcher/src")) return false;
  if (_.startsWith(file, "bin")) return false;
  if (_.startsWith(file, "builds") || _.startsWith(file, "projects")) return false;
  if (file === "config.json") return false;
  return true;
};

readdirRecursive(sourceRootPath, function(err, files) {
  if (err != null) { console.log(err); return; }

  files = _.filter(files, shouldDistribute);

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var relativeFile = file.substring(sourceRootPath.length + 1);
    var targetPath = targetRootPath + "/app/" + relativeFile;
    mkdirp.sync(path.dirname(targetPath));
    fs.writeFileSync(targetPath, fs.readFileSync(file));
  }

  var buildPaths = getBuildPaths(targetRootPath + "/app");
  var execSuffix = process.platform == "win32";

  async.eachSeries(buildPaths, function(buildPath, cb) {
    if (!fs.existsSync(buildPath + "/package.json")) { cb(); return; }
    var spawnOptions = { cwd: buildPath, env: process.env, stdio: "inherit" };
    var npm = child_process.spawn("npm" + (execSuffix ? ".cmd" : ""), [ "prune", "--production" ], spawnOptions);

    npm.on("close", function(status) {
      if (status !== 0) console.error("[" + buildPath + "] npm exited with status code " + status);
      cb();
    });
  }, function() {
    var launcherPackage = fs.readFileSync(targetRootPath + "/app/launcher/package.json", { encoding: "utf8" });
    launcherPackage = launcherPackage.replace("main.js", "app/launcher/main.js");
    fs.writeFileSync(targetRootPath + "/package.json", launcherPackage, { encoding: "utf8" });
    fs.unlinkSync(targetRootPath + "/app/launcher/package.json");
  });
});
