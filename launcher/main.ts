/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/github-electron/github-electron-main.d.ts" />

import * as app from "app";
import * as BrowserWindow from "browser-window";
import * as ipc from "ipc";
import * as dialog from "dialog";

import * as _ from "lodash";
import * as async from "async";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as mkdirp from "mkdirp";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: GitHubElectron.BrowserWindow;

app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

app.on("ready", function() {
  mainWindow = new BrowserWindow({
    title: "Superpowers", icon: `${__dirname}/public/images/icon.png`,
    width: 800, height: 480,
    "auto-hide-menu-bar": true, frame: false, resizable: false
  });

  mainWindow.loadUrl(`${__dirname}/public/index.html`);

  mainWindow.on("closed", function() { mainWindow = null; });
});

interface OpenServer { window: GitHubElectron.BrowserWindow; address: string; }
let openServersById: { [id: string]: OpenServer } = {};
ipc.on("new-server-window", (event: Event, address: string) => {
  let openServer = {
    window: new BrowserWindow({
      title: "Superpowers", icon: `${__dirname}/public/images/icon.png`,
      width: 1000, height: 600,
      "min-width": 800, "min-height": 480,
      "auto-hide-menu-bar": true, frame: false
    }),
    address
  };
  openServersById[openServer.window.id] = openServer;

  openServer.window.on("closed", () => { delete openServersById[openServer.window.id]; });

  let status = `Connecting to ${openServer.address}...`;
  openServer.window.loadUrl(`${__dirname}/public/connectionStatus.html?status=${encodeURIComponent(status)}&address=${encodeURIComponent(openServer.address)}`);

  openServer.window.webContents.addListener("did-finish-load", onServerWindowLoaded);
  function onServerWindowLoaded(event: Event) {
    openServer.window.webContents.removeListener("did-finish-load", onServerWindowLoaded);
    connect(openServersById[openServer.window.id]);
  }
});

function connect(openServer: OpenServer) {
  openServer.window.loadUrl(`http://${openServer.address}`);
  openServer.window.webContents.addListener("did-finish-load", onServerLoaded);
  openServer.window.webContents.addListener("did-fail-load", onServerFailed);

  function onServerLoaded(event: Event) {
    openServer.window.webContents.removeListener("did-finish-load", onServerLoaded);
    openServer.window.webContents.removeListener("did-fail-load", onServerFailed);
  }

  function onServerFailed(event: Event) {
    openServer.window.webContents.removeListener("did-finish-load", onServerLoaded);
    openServer.window.webContents.removeListener("did-fail-load", onServerFailed);

    // NOTE: As of Electron v0.35.1, if we don't wrap the call to loadUrl
    // in a callback, the app closes unexpectedly most of the time.
    setTimeout(() => {
      let status = `Could not connect to ${openServer.address}`;
      openServer.window.loadUrl(`${__dirname}/public/connectionStatus.html?status=${encodeURIComponent(status)}&address=${encodeURIComponent(openServer.address)}&reload=true`);
    }, 0);
  }
}

let standaloneWindowsById:  { [id: string]: GitHubElectron.BrowserWindow } = {};
ipc.on("new-standalone-window", (event: Event, address: string) => {
  let standaloneWindow = new BrowserWindow({
    title: "Superpowers", icon: `${__dirname}/public/images/icon.png`,
    width: 1000, height: 600,
    "min-width": 800, "min-height": 480,
    "auto-hide-menu-bar": true
  });

  standaloneWindowsById[standaloneWindow.id] = standaloneWindow;

  standaloneWindow.on("closed", () => { delete standaloneWindowsById[standaloneWindow.id]; });
  standaloneWindow.loadUrl(address);
});

ipc.on("reconnect", (event: Event, id: string) => { connect(openServersById[id]); });

ipc.on("request-export", (event: { sender: any }) => {
  dialog.showOpenDialog({ properties: ["openDirectory"] }, (directory: string[]) => {
    if (directory == null) return;

    let outputFolder = directory[0];
    let isFolderEmpty = false;
    try { isFolderEmpty = fs.readdirSync(outputFolder).length === 0; }
    catch (e) { event.sender.send("export-failed", `Error while checking if folder was empty: ${e.message}`); return; }
    if (!isFolderEmpty) { event.sender.send("export-failed", "Output folder must be empty."); return; }

    event.sender.send("export-succeed", outputFolder);
  });
});

interface ExportData {
  projectId: string; buildId: string;
  address: string; mainPort: string; buildPort: string;
  outputFolder: string; files: string[];
}
ipc.on("export", (event: { sender: any }, data: ExportData) => {
  let exportWindow: GitHubElectron.BrowserWindow = new BrowserWindow({
    title: "Superpowers", icon: `${__dirname}/public/images/icon.png`,
    width: 1000, height: 600,
    "min-width": 800, "min-height": 480,
    "auto-hide-menu-bar": true,
    "node-integration": true
  });
  exportWindow.loadUrl(`${data.address}:${data.mainPort}/build.html`);

  let doExport = () => {
    exportWindow.webContents.removeListener("did-finish-load", doExport);
    exportWindow.webContents.executeJavaScript(`
    document.title = "Superpowers — Exporting...";
    document.querySelector(".status").textContent = "Exporting...";
    `);

    exportWindow.setProgressBar(0);
    let progress = 0;
    let progressMax = data.files.length;
    let buildPath = `/builds/${data.projectId}/${data.buildId}`;
    let systemsPath = "/systems/";

    async.eachLimit(data.files, 10, (file: string, cb: (err: Error) => any) => {

      let outputFilename = file;
      if (_.startsWith(outputFilename, buildPath)) {
        // Project build files are served on the build port
        outputFilename = outputFilename.substr(buildPath.length);
        file = `${data.address}:${data.buildPort}${file}`;
      } else {
        // Other files are served on the main port
        file = `${data.address}:${data.mainPort}${file}`;

        if (_.startsWith(outputFilename, systemsPath)) {
          // Output system files at the root
          outputFilename = outputFilename.substr(outputFilename.indexOf("/", systemsPath.length));
        }
      }
      outputFilename = outputFilename.replace(/\//g, path.sep);

      let outputPath = `${data.outputFolder}${outputFilename}`;
      exportWindow.webContents.executeJavaScript(`
      document.querySelector(".status").textContent = "${outputPath}";
      `);

      http.get(file, (response) => {
        mkdirp(path.dirname(outputPath), (err: Error) => {
          let localFile = fs.createWriteStream(outputPath);
          localFile.on("finish", () => {
            progress++;
            exportWindow.setProgressBar(progress / progressMax);
            cb(null);
          });
          response.pipe(localFile);
        });
      }).on("error", cb);
    } , (err: Error) => {
      exportWindow.setProgressBar(-1);
      if (err != null) { alert(err); return; }
      // TODO: Add link to open in file browser
      exportWindow.webContents.executeJavaScript(`
      document.title = "Superpowers — Exported";
      document.querySelector(".status").textContent = "Exported to ${data.outputFolder}";
      `);
    });
  };
  exportWindow.webContents.addListener("did-finish-load", doExport);
});

