import * as yargs from "yargs";
import * as dummy_https from "https";
import * as mkdirp from "mkdirp";
import * as path from "path";
import * as fs from "fs";
import * as async from "async";
import * as readline from "readline";

/* tslint:disable */
const https: typeof dummy_https = require("follow-redirects").https;
const yauzl = require("yauzl");
/* tslint:enable */

export const folderNameRegex = /^[a-z0-9_-]+$/;
export const pluginNameRegex = /^[A-Za-z0-9]+\/[A-Za-z0-9]+$/;

// Data path
const argv = yargs
  .describe("data-path", "Path to store/read data files from, including config and projects")
  .describe("download-url", "Url to download a release")
  .boolean("force")
  .argv;
export const dataPath = argv["data-path"] != null ? path.resolve(argv["data-path"]) : path.resolve(`${__dirname}/../..`);
mkdirp.sync(dataPath);
mkdirp.sync(`${dataPath}/projects`);
mkdirp.sync(`${dataPath}/builds`);
export const systemsPath = `${dataPath}/systems`;
mkdirp.sync(systemsPath);

export const force = argv["force"];
export const downloadURL = argv["download-url"];

// Systems and plugins
export const builtInPluginAuthors = [ "default", "common", "extra" ];
export const systemsById: { [id: string]: {
  folderName: string;
  version: string;
  isDev: boolean;
  plugins: { [author: string]: string[] }
} } = {};

for (const entry of fs.readdirSync(systemsPath)) {
  if (!folderNameRegex.test(entry)) continue;
  if (!fs.statSync(`${systemsPath}/${entry}`).isDirectory) continue;

  let systemId: string;
  let version: string;
  const systemPath = `${systemsPath}/${entry}`;
  try {
    const packageDataFile = fs.readFileSync(`${systemPath}/package.json`, { encoding: "utf8" });
    const packageData = JSON.parse(packageDataFile);
    systemId = packageData.superpowers.systemId;
    version = packageData.version;
  } catch (err) {
    emitError(`Could not load system id from systems/${entry}/package.json:`, err.stack);
  }

  let isDev = true;
  try { if (!fs.lstatSync(`${systemPath}/.git`).isDirectory()) isDev = false; }
  catch (err) { isDev = false; }

  systemsById[systemId] = { folderName: entry, version, isDev, plugins: {} };
  let pluginAuthors: string[];
  try { pluginAuthors = fs.readdirSync(`${systemPath}/plugins`); } catch (err) { /* Ignore */ }
  if (pluginAuthors == null) continue;

  for (const pluginAuthor of pluginAuthors) {
    if (builtInPluginAuthors.indexOf(pluginAuthor) !== -1) continue;
    if (!folderNameRegex.test(pluginAuthor)) continue;

    const pluginNames: string[] = [];
    for (const pluginName of fs.readdirSync(`${systemPath}/plugins/${pluginAuthor}`)) {
      if (!folderNameRegex.test(pluginName)) continue;
      if (!fs.statSync(`${systemPath}/plugins/${pluginAuthor}/${pluginName}`).isDirectory) continue;
      pluginNames.push(pluginName);
    }
    if (pluginNames.length > 0) {
      systemsById[systemId].plugins[pluginAuthor] = pluginNames;
    }
  }
}

export function listAvailableSystems(registry: Registry) { console.log(`Available systems: ${Object.keys(registry.systems).join(", ")}.`); }
export function listAvailablePlugins(registry: Registry, systemId: string) {
  const pluginAuthors = Object.keys(registry.systems[systemId].plugins);
  if (pluginAuthors.length === 0) {
    console.log(`No plugins found.`);
  } else {
    let pluginCount = 0;
    for (const pluginAuthor of pluginAuthors) pluginCount += Object.keys(registry.systems[systemId].plugins[pluginAuthor]).length;

    for (const pluginAuthor of pluginAuthors) {
      console.log(`  ${pluginAuthor}/`);
      for (const pluginName of Object.keys(registry.systems[systemId].plugins[pluginAuthor])) console.log(`    ${pluginName}`);
    }
  }
}

const currentRegistryVersion = 1;
type Registry = {
  version: number;
  core: {
    version: string;
    downloadURL: string;
    localVersion: string;
    isLocalDev: boolean;
  }
  systems: { [sytemId: string]: {
    repository: string;
    version: string;
    downloadURL: string;
    localVersion: string;
    isLocalDev: boolean;
    plugins: { [author: string]: { [name: string]: string } }
} } };
export function getRegistry(callback: (err: Error, registry: Registry) => any) {
  // FIXME: Use registry.json instead once the next release is out
  const registryUrl = "https://raw.githubusercontent.com/superpowers/superpowers-core/master/registryNext.json";
  const request = https.get(registryUrl, (res) => {
    if (res.statusCode !== 200) {
      callback(new Error(`Unexpected status code: ${res.statusCode}`), null);
      return;
    }

    let content = "";
    res.on("data", (chunk: string) => { content += chunk; });
    res.on("end", () => {
      let registry: Registry;
      try { registry = JSON.parse(content); }
      catch (err) {
        callback(new Error(`Could not parse registry as JSON`), null);
        return;
      }

      if (registry.version !== currentRegistryVersion) {
        callback(new Error("The registry format has changed. Please update Superpowers."), null);
      } else {
        getLatestRelease("https://github.com/superpowers/superpowers-core", (version, downloadURL) => {
          const packageData = fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" });
          const { version: localVersion } = JSON.parse(packageData);

          let isLocalDev = true;
          try { if (!fs.lstatSync(`${__dirname}/../../.git`).isDirectory()) isLocalDev = false; }
          catch (err) { isLocalDev = false; }

          registry.core = { version, downloadURL, localVersion, isLocalDev };

          async.each(Object.keys(registry.systems), (systemId, cb) => {
            const system = registry.systems[systemId];
            getLatestRelease(system.repository, (version, downloadURL) => {
              system.version = version;
              system.downloadURL = downloadURL;

              if (systemsById[systemId] != null) {
                system.localVersion = systemsById[systemId].version;
                system.isLocalDev = systemsById[systemId].isDev;
              } else {
                system.isLocalDev = false;
              }

              cb();
            });
          }, (err) => { callback(err, registry); });
        });
      }
    });
  });

  request.on("error", (err: Error) => {
    callback(err, null);
  });
}

export function getLatestRelease(repositoryURL: string, callback: (version: string, downloadURL: string) => void) {
  const repositoryPath = `${repositoryURL.replace("https://github.com", "/repos")}/releases/latest`;
  const request = https.get({
    hostname: "api.github.com",
    path: repositoryPath,
    headers: { "user-agent": "Superpowers" }
  }, (res) => {
    if (res.statusCode !== 200) {
      const err = new Error(`Unexpected status code: ${res.statusCode}`);
      emitError(`Couldn't get latest release from repository at ${repositoryURL}:`, err.stack);
    }

    let content = "";
    res.on("data", (chunk: string) => { content += chunk; });
    res.on("end", () => {
      const repositoryInfo = JSON.parse(content);
      callback(repositoryInfo.tag_name.slice(1), repositoryInfo.assets[0].browser_download_url);
    });
  });

  request.on("error", (err: Error) => {
    emitError(`Couldn't get latest release from repository at ${repositoryURL}:`, err.stack);
  });
}

export function downloadRelease(downloadURL: string, downloadPath: string, callback: (err: string) => void) {
  console.log("0%");

  https.get({
    hostname: "github.com",
    path: downloadURL,
    headers: { "user-agent": "Superpowers" }
  }, (res) => {
    if (res.statusCode !== 200) {
      callback(`Unexpected status code: ${res.statusCode}`);
      return;
    }

    let progress = 0;
    let progressMax = parseInt(res.headers["content-length"], 10) * 2;

    const buffers: Buffer[] = [];
    res.on("data", (data: Buffer) => { buffers.push(data); progress += data.length; onProgress(progress / progressMax); });
    res.on("end", () => {
      const zipBuffer = Buffer.concat(buffers);

      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err: Error, zipFile: any) => {
        if (err != null) throw err;

        progress = zipFile.entryCount;
        progressMax = zipFile.entryCount * 2;

        const rootFolderName = path.parse(downloadURL).name;

        zipFile.readEntry();
        zipFile.on("entry", (entry: any) => {
          if (entry.fileName.indexOf(rootFolderName) !== 0) throw new Error(`Found file outside of root folder: ${entry.fileName} (${rootFolderName})`);

          const filename = path.join(downloadPath, entry.fileName.replace(rootFolderName, ""));
          if (/\/$/.test(entry.fileName)) {
            mkdirp(filename, (err) => {
              if (err != null) throw err;
              progress++;
              onProgress(progress / progressMax);
              zipFile.readEntry();
            });
          } else {
            zipFile.openReadStream(entry, (err: Error, readStream: NodeJS.ReadableStream) => {
              if (err) throw err;

              mkdirp(path.dirname(filename), (err: Error) => {
                if (err) throw err;
                readStream.pipe(fs.createWriteStream(filename));
                readStream.on("end", () => {
                  progress++;
                  onProgress(progress / progressMax);
                  zipFile.readEntry();
                });
              });
            });
          }
        });

        zipFile.on("end", () => {
          callback(null);
        });
      });
    });
  });
}

function onProgress(value: number) {
  value = Math.round(value * 100);

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0, 1);
  console.log(`${value}%`);
  if (process != null && process.send != null) process.send({ type: "progress", value });
}

export function emitError(message: string, details?: string) {
  console.error(message);
  console.error(details);
  if (process != null && process.send != null) process.send({ type: "error", message });

  process.exit(1);
}
