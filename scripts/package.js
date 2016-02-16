"use strict"

const yargs = require("yargs");
const fs = require("fs");
const path = require("path");
const getBuildPaths = require("./getBuildPaths");
const readdirRecursive = require("recursive-readdir");
const mkdirp = require("mkdirp");
const async = require("async");
const _ = require("lodash");
const child_process = require("child_process");

const argv = yargs.argv;
const systemName = argv._[0];


let sourceRootPath = path.resolve(`${__dirname}/..`);
let packageName = "core";
if (systemName != null) {
  sourceRootPath = path.join(sourceRootPath, `systems/${systemName}`);
  packageName = systemName;
}
const rootPackage = require(`${sourceRootPath}/package.json`);
const folderName = `superpowers-${packageName}-v${rootPackage.version}`;
const packagesPath = path.resolve(`${__dirname}/../packages`);
const targetRootPath = path.join(packagesPath, folderName);

try { mkdirp(targetRootPath); }
catch (error) { console.log(`Could not create ${targetRootPath}`); process.exit(1); }

const ignoredFiles = [
  "config.json", "registry.json", "tsd.json", "tslint.json",
  "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"
];
function shouldIgnore(file) {
  file = file.substring(sourceRootPath.length + 1).replace(/\\/g, "/");

  // Protected folders
  if (file.indexOf("node_modules/") !== -1) return false;
  if (file.indexOf("public/") !== -1) return false;

  // TODO: Get rid of this?
  // Currently required to protect .d.ts API files
  // loaded by the server in Superpowers Game
  if (file.indexOf("typings/") !== -1) return false;

  if (file[0] === "." || file.indexOf("/.") !== -1) return true;
  if (_.endsWith(file, ".orig")) return true;

  if (_.endsWith(file, "gulpfile.js") || _.endsWith(file, "Gulpfile.js")) return true;
  if (_.endsWith(file, "tsconfig.json")) return true;

  if (file.indexOf("editors/") !== -1) return true;
  if (_.endsWith(file, ".ts")) return true;
  if (_.startsWith(file, "client")) return true;
  if (_.startsWith(file, "SupClient")) return true;
  if (_.startsWith(file, "scripts")) return true;
  if (_.startsWith(file, "systems")) return true;
  if (_.startsWith(file, "workbench")) return true;
  if (_.startsWith(file, "builds") || _.startsWith(file, "projects")) return true;
  if (ignoredFiles.indexOf(file) !== -1) return true;

  return false;
};

console.log(`Packaging ${folderName} in ${targetRootPath}...`);

readdirRecursive(sourceRootPath, [ shouldIgnore ], (err, files) => {
  if (err != null) { console.log(err); return; }

  for (const file of files) {
    const relativeFile = file.substring(sourceRootPath.length + 1);
    const targetPath = `${targetRootPath}/${relativeFile}`;
    mkdirp.sync(path.dirname(targetPath));
    fs.writeFileSync(targetPath, fs.readFileSync(file));
  }

  const buildPaths = getBuildPaths(targetRootPath);
  const execSuffix = process.platform == "win32";

  console.log("Pruning development-only packages from exported folders...");

  async.eachSeries(buildPaths, (buildPath, cb) => {
    if (!fs.existsSync(`${buildPath}/package.json`)) { cb(); return; }
    const spawnOptions = { cwd: buildPath, env: process.env, stdio: "inherit" };
    const npm = child_process.spawn(`npm${execSuffix ? ".cmd" : ""}`, [ "prune", "--production" ], spawnOptions);

    npm.on("close", (status) => {
      if (status !== 0) console.error(`[${buildPath}] npm exited with status code ${status}`);
      cb();
    });
  }, () => {
    console.log(`Generating archive for ${folderName}.`);
    try {
      child_process.execSync(`zip --symlinks -r ${folderName}.zip ${folderName}`, { cwd: packagesPath });
    } catch (err) {
      console.error(err.stack);
    }

    console.log("Done.");
  });
});
