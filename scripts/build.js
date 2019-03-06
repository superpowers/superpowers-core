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

let anyRequireFailed = false;

try {
  require.resolve("async");
  require.resolve("yargs");
  require.resolve("chalk");
} catch (err) {
  anyRequireFailed = true;
}

if (anyRequireFailed) {
  const spawnOptions = { cwd: rootPath, env: process.env, stdio: "inherit" };
  const result = child_process.spawnSync("npm" + (execSuffix ? ".cmd" : ""), [ "install", "async", "yargs", "chalk" ], spawnOptions);

  if (result.error != null) {
    log("Failed to install async, args and chalk");
    console.log(result.error);
    process.exit(1);
  }

  // NOTE: Without a small delay after npm exits,
  // installation sometimes fails since Node.js 5.x.
  setTimeout(build, 1000);
} else build();

function build() {
  const async = require("async");
  let buildPaths = require("./getBuildPaths")(rootPath).map((buildPath) => path.sep + path.relative(rootPath, buildPath));

  // Arguments
  const yargs = require("yargs");

  const argv = yargs.option("verbose", { alias: "v", describe: "Verbose mode" }).argv;

  if (argv._.length > 0) {
    const baseFilter = argv._[0].replace(/[\\/]/g, path.sep);
    let actualFilter = baseFilter.toLowerCase();

    const negated = actualFilter[0] === "!";
    if (negated) actualFilter = actualFilter.substring(1);

    const rooted = actualFilter[0] === ".";
    if (rooted) actualFilter = actualFilter.substring(1);

    const oldPathCount = buildPaths.length;
    buildPaths = buildPaths.filter((buildPath) => {
      const index = (buildPath + path.sep).toLowerCase().indexOf(actualFilter);
      const found = rooted ? index === 0 : index !== -1;
      return negated ? !found : found;
    });
    log(`Rebuilding "${baseFilter}", leaving out ${oldPathCount - buildPaths.length} paths`);
  }

  // Build
  log(`Build paths: ${buildPaths.join(", ")}`);

  const errors = [];
  let progress = 0;

  const chalk = require("chalk");
  const styleBuildPath = chalk.bgWhite.black;

  async.eachSeries(buildPaths, (relBuildPath, callback) => {
    log(styleBuildPath(`Building ${relBuildPath} (${++progress}/${buildPaths.length})`));
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
          const args = [ "run", "build" ];
          const npm = child_process.spawn(`npm${execSuffix ? ".cmd" : ""}`, args, spawnOptions);

          npm.on("close", (status) => {
            if (status !== 0) errors.push(`${relBuildPath}: "npm run build" exited with status code ${status}`);
            cb();
          });
          return;
        }

        // Check if the package has a gulpfile instead
        if (fs.existsSync(`${absBuildPath}/gulpfile.js`)) {
          const args = [];
          // if (!argv.verbose) args.push("--silent");
          const gulp = child_process.spawn(`gulp${execSuffix ? ".cmd" : ""}`, args, spawnOptions);

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
}
