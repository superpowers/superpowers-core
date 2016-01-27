"use strict";

const startTime = Date.now();

const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const execSuffix = process.platform == "win32";
const rootPath = path.resolve(`${__dirname}/..`);

function log(message) {
  const date = new Date();
  console.log(`${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${message}`);
}

try {
  require.resolve("async");
} catch (err) {
  const spawnOptions = { cwd: rootPath, env: process.env, stdio: "inherit" };
  const result = child_process.spawnSync("npm" + (execSuffix ? ".cmd" : ""), [ "install", "async" ], spawnOptions);

  if (result.error != null) {
    log("Failed to install async");
    console.log(result.error);
    process.exit(1);
  }
}

const async = require("async");
let buildPaths = require("./getBuildPaths")(rootPath).map((buildPath) => path.sep + path.relative(rootPath, buildPath));

// Filter
if (process.argv.length > 2) {
  const filter = process.argv[2];
  const oldPathCount = buildPaths.length;
  buildPaths = buildPaths.filter((buildPath) => path.relative(rootPath, buildPath).toLowerCase().indexOf(filter.toLowerCase()) !== -1);
  log(`Rebuilding "${filter}", leaving out ${oldPathCount - buildPaths.length} paths`);
}

// Build
log(`Build paths: ${buildPaths.join(", ")}`);

const errors = [];
let progress = 0;

async.eachSeries(buildPaths, (relBuildPath, callback) => {
  log(`Building ${relBuildPath} (${++progress}/${buildPaths.length})`);
  const absBuildPath = path.resolve(path.join(rootPath, relBuildPath));
  const spawnOptions = { cwd: absBuildPath, env: process.env, stdio: "inherit" };

  async.waterfall([

    (cb) => {
      if (!fs.existsSync(`${absBuildPath}/package.json`)) { cb(null, null); return; }
      const packageJSON = require(`${absBuildPath}/package.json`);
      cb(null, packageJSON);
    },

    (packageJSON, cb) => {
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

      const npm = child_process.spawn(`npm${execSuffix ? ".cmd" : ""}`, [ "install" ], spawnOptions);

      npm.on("close", (status) => {
        if (status !== 0) errors.push(`${relBuildPath}: "npm install" exited with status code ${status}`);
        cb(null, packageJSON);
      });
    },

    (packageJSON, cb) => {
      // Check if the package has a build script
      if (absBuildPath !== rootPath && packageJSON != null && packageJSON.scripts != null && packageJSON.scripts.build != null) {
        const npm = child_process.spawn(`npm${execSuffix ? ".cmd" : ""}`, [ "run", "build" ], spawnOptions);
  
        npm.on("close", (status) => {
          if (status !== 0) errors.push(`${relBuildPath}: "npm run build" exited with status code ${status}`);
          cb();
        });
        return;
      }

      // Check if the package has a gulpfile instead
      if (fs.existsSync(`${absBuildPath}/gulpfile.js`)) {
        const gulp = child_process.spawn(`gulp${execSuffix ? ".cmd" : ""}`, [], spawnOptions);

        gulp.on("close", (status) => {
          if (status !== 0) errors.push(`${relBuildPath}: "gulp" exited with status code ${status}`);
          cb();
        });
        return;
      }

      cb();
    }

  ], callback);
}, () => {
  console.log("");

  if (errors.length > 0) {
    log("There were build errors:");
    for (const error of errors) console.log(error);
    process.exit(1);
  } else {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    log(`Build completed in ${minutes}mn ${seconds}s.`);
  }
});
