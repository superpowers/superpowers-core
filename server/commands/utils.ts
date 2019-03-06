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
export const dataPath = argv["data-path"] != null ? path.resolve(argv["data-path"] as string) : path.resolve(`${__dirname}/../..`);
mkdirp.sync(dataPath);
mkdirp.sync(`${dataPath}/projects`);
mkdirp.sync(`${dataPath}/builds`);
export const systemsPath = `${dataPath}/systems`;
mkdirp.sync(systemsPath);

export const force = argv["force"];
export const downloadURL = argv["download-url"] as string;

// Systems and plugins
export const builtInPluginAuthors = [ "default", "common", "extra" ];
export const systemsById: { [id: string]: {
  folderName: string;
  version: string;
  isDev: boolean;
  plugins: { [authorName: string]: { [pluginName: string]: { version: string; isDev: boolean; } } };
} } = {};

for (const entry of fs.readdirSync(systemsPath)) {
  if (!folderNameRegex.test(entry)) continue;
  if (!fs.statSync(`${systemsPath}/${entry}`).isDirectory) continue;

  let systemId: string;
  let systemVersion: string;
  const systemPath = `${systemsPath}/${entry}`;
  try {
    const packageDataFile = fs.readFileSync(`${systemPath}/package.json`, { encoding: "utf8" });
    const packageData = JSON.parse(packageDataFile);
    systemId = packageData.superpowers.systemId;
    systemVersion = packageData.version;
  } catch (err) {
    emitError(`Could not load system id from systems/${entry}/package.json:`, err.stack);
  }

  let isDev = true;
  try { if (!fs.lstatSync(`${systemPath}/.git`).isDirectory()) isDev = false; }
  catch (err) { isDev = false; }

  systemsById[systemId] = { folderName: entry, version: systemVersion, isDev, plugins: {} };
  let pluginAuthors: string[];
  try { pluginAuthors = fs.readdirSync(`${systemPath}/plugins`); } catch (err) { /* Ignore */ }
  if (pluginAuthors == null) continue;

  for (const pluginAuthor of pluginAuthors) {
    if (builtInPluginAuthors.indexOf(pluginAuthor) !== -1) continue;
    if (!folderNameRegex.test(pluginAuthor)) continue;

    systemsById[systemId].plugins[pluginAuthor] = {};
    for (const pluginName of fs.readdirSync(`${systemPath}/plugins/${pluginAuthor}`)) {
      if (!folderNameRegex.test(pluginName)) continue;

      const pluginPath = `${systemPath}/plugins/${pluginAuthor}/${pluginName}`;
      if (!fs.statSync(pluginPath).isDirectory) continue;

      let pluginVersion: string;
      try {
        const packageDataFile = fs.readFileSync(`${pluginPath}/package.json`, { encoding: "utf8" });
        const packageData = JSON.parse(packageDataFile);
        pluginVersion = packageData.version;
      } catch (err) {
        emitError(`Could not load plugin verson from systems/${entry}/${pluginAuthor}/${pluginName}/package.json:`, err.stack);
      }

      let isDev = true;
      try { if (!fs.lstatSync(`${pluginPath}/.git`).isDirectory()) isDev = false; }
      catch (err) { isDev = false; }

      systemsById[systemId].plugins[pluginAuthor][pluginName] = { version: pluginVersion, isDev };
    }
  }
}

export function listAvailableSystems(registry: Registry) { console.log(`Available systems: ${Object.keys(registry.systems).join(", ")}.`); }
export function listAvailablePlugins(registry: Registry, systemId: string) {
  const pluginAuthors = Object.keys(registry.systems[systemId].plugins);
  if (pluginAuthors.length === 0) {
    console.log(`No plugins found.`);
  } else {
    /* let pluginCount = 0;
    for (const pluginAuthor of pluginAuthors) pluginCount += Object.keys(registry.systems[systemId].plugins[pluginAuthor]).length; */

    for (const pluginAuthor of pluginAuthors) {
      console.log(`  ${pluginAuthor}/`);
      for (const pluginName of Object.keys(registry.systems[systemId].plugins[pluginAuthor])) console.log(`    ${pluginName}`);
    }
  }
}

const currentRegistryVersion = 2;

interface ItemData { version: string; downloadURL: string; localVersion: string; isLocalDev: boolean; }
interface SystemData extends ItemData {
  plugins: { [authorName: string]: { [pluginName: string]: ItemData; } };
}

type Registry = {
  version: number;
  core: ItemData;
  systems: { [sytemId: string]: SystemData }
};

export function getRegistry(callback: (err: Error, registry: Registry) => any) {
  const registryUrl = "https://raw.githubusercontent.com/superpowers/superpowers-registry/master/registry.json";
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
        const packageData = fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" });
        const { version: localCoreVersion } = JSON.parse(packageData);
        registry.core.localVersion = localCoreVersion;

        let isLocalCoreDev = true;
        try { if (!fs.lstatSync(`${__dirname}/../../.git`).isDirectory()) isLocalCoreDev = false; }
        catch (err) { isLocalCoreDev = false; }
        registry.core.isLocalDev = isLocalCoreDev;

        async.each(Object.keys(registry.systems), (systemId, cb) => {
          const registrySystem = registry.systems[systemId];
          const localSystem = systemsById[systemId];

          if (localSystem != null) {
            registrySystem.localVersion = localSystem.version;
            registrySystem.isLocalDev = localSystem.isDev;
          } else {
            registrySystem.isLocalDev = false;
          }

          async.each(Object.keys(registrySystem.plugins), (authorName, cb) => {
            async.each(Object.keys(registrySystem.plugins[authorName]), (pluginName, cb) => {
              const registryPlugin = registrySystem.plugins[authorName][pluginName];
              const localPlugin = localSystem != null && localSystem.plugins[authorName] != null ? localSystem.plugins[authorName][pluginName] : null;

              if (localPlugin != null) {
                registryPlugin.localVersion = localPlugin.version;
                registryPlugin.isLocalDev = localPlugin.isDev;
              } else {
                registryPlugin.isLocalDev = false;
              }

              cb();
            }, cb);
          }, cb);
        }, (err: Error) => { callback(err, registry); });
      }
    });
  });

  request.on("error", (err: Error) => {
    callback(err, null);
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
      let zipBuffer = Buffer.concat(buffers);

      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err: Error, zipFile: any) => {
        if (err != null) throw err;

        progress = zipFile.entryCount;
        progressMax = zipFile.entryCount * 2;

        let rootFolderName: string;

        zipFile.readEntry();
        zipFile.on("entry", (entry: any) => {
          if (rootFolderName == null) rootFolderName = entry.fileName;

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
          // NOTE: Necessary to allow manipulating files right after download
          setTimeout(callback, 100);
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
  if (details != null) console.error(details);
  if (process != null && process.send != null) process.send({ type: "error", message });

  process.exit(1);
}
