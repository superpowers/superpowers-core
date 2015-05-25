/// <reference path="index.d.ts" />

import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import * as express from "express";
import * as socketio from "socket.io";

import * as paths from "./paths";
import * as buildFiles from "./buildFiles";
import config from "./config";
import * as SupAPI from "../SupAPI/index";
import * as SupCore from "../SupCore/index";
import ProjectHub from "./ProjectHub";

// Globals
(<any>global).SupAPI = SupAPI;
(<any>global).SupCore = SupCore;

SupCore.log("Server starting...");

process.on("uncaughtException", (err: Error) => {
  SupCore.log(`The server crashed.\n${(<any>err).stack}`);
  process.exit(1);
});

function handle404(err: any, req: express.Request, res: express.Response, next: Function) {
  if (err.status === 404) {res.status(404).end("File not found"); return; }
  next();
}

// Main HTTP Server
let mainApp = express();
mainApp.use("/", express.static(`${__dirname}/../public`));

let mainHttpServer = http.createServer(mainApp);
mainHttpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    SupCore.log(`Could not start the server: another application is already listening on port ${config.mainPort}.`);
    process.exit()
  } else throw(err);
});

let io = socketio(mainHttpServer, { transports: ["websocket"] });

// Build HTTP Server
let hub: ProjectHub = null;

let buildApp = express();
buildApp.use("/", express.static(`${__dirname}/../public`));

buildApp.get("/builds/:projectId/:buildId/*", (req, res) => {
  let projectServer = hub.serversById[req.params.projectId];
  if (projectServer == null) { res.status(404).end("No such project"); return; }
  res.sendFile(path.join(projectServer.projectPath, "builds", req.params.buildId, req.params[0]));
});

let buildHttpServer = http.createServer(buildApp);

// Load plugins
function shouldIgnorePlugin(pluginName: string) { return pluginName.indexOf(".") !== -1 || pluginName === "node_modules"; }

let pluginsPath = `${__dirname}/../plugins`;
let pluginNamesByAuthor: { [author: string]: string[] } = {};
for (let pluginAuthor of fs.readdirSync(pluginsPath)) {
  let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;

  pluginNamesByAuthor[pluginAuthor] = [];
  for (let pluginName of fs.readdirSync(pluginAuthorPath)) {
    if (shouldIgnorePlugin(pluginName)) continue;
    pluginNamesByAuthor[pluginAuthor].push(pluginName);
  }
}

// First pass
let requiredPluginFiles = [ "data", "components", "componentEditors", "settingsEditors", "api", "runtime" ];

for (let pluginAuthor in pluginNamesByAuthor) {
  let pluginNames = pluginNamesByAuthor[pluginAuthor];
  let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`;

  for (let pluginName of pluginNames) {
    let pluginPath = `${pluginAuthorPath}/${pluginName}`;

    // Load scripting API module
    let apiModulePath = `${pluginPath}/api`;
    if (fs.existsSync(apiModulePath)) require(apiModulePath);

    // Expose public stuff
    mainApp.use(`/plugins/${pluginAuthor}/${pluginName}`, express.static(`${pluginPath}/public`));
    buildApp.use(`/plugins/${pluginAuthor}/${pluginName}`, express.static(`${pluginPath}/public`));
    mainApp.use(handle404);
    buildApp.use(handle404);

    // Ensure all required files exist
    for (let requiredFile of requiredPluginFiles) {
      let requiredFilePath = `${pluginPath}/public/${requiredFile}.js`;
      if (!fs.existsSync(requiredFilePath)) fs.closeSync(fs.openSync(requiredFilePath, "w"));
    }
  }
}

// Second pass, because data modules might depend on API modules
interface EditorOrToolInfo {
  title: { [language: string]: string };
  pluginPath: string;
}

let pluginsInfo = {
  all: <string[]>[],
  editorsByAssetType: <{ [assetType: string]: EditorOrToolInfo }>{},
  toolsByName: <{ [toolName: string]: EditorOrToolInfo }>{} };

for (let pluginAuthor in pluginNamesByAuthor) {
  let pluginNames = pluginNamesByAuthor[pluginAuthor];
  let pluginAuthorPath = `${pluginsPath}/${pluginAuthor}`

  for (let pluginName of pluginNames) {
    let pluginPath = `${pluginAuthorPath}/${pluginName}`;

    // Load data module
    let dataModulePath = `${pluginPath}/data`;
    if (fs.existsSync(dataModulePath)) require(dataModulePath);

    // Collect plugin info
    pluginsInfo.all.push(`${pluginAuthor}/${pluginName}`);
    if (fs.existsSync(`${pluginPath}/editors`)) {
      for (let editorName of fs.readdirSync(`${pluginPath}/editors`)) {
        let title = editorName;
        try { title = JSON.parse(fs.readFileSync(`${pluginPath}/public/editors/${editorName}/locales/en/main.json`, { encoding: "utf8" })).title }
        catch(e) {}

        if (SupCore.data.assetClasses[editorName] != null) {
          pluginsInfo.editorsByAssetType[editorName] = {
            title: { en: title },
            pluginPath: `${pluginAuthor}/${pluginName}`
          };
        } else {
          pluginsInfo.toolsByName[editorName] = { pluginPath: `${pluginAuthor}/${pluginName}`, title: { en: title } };
        }
      }
    }
  }
}

fs.writeFileSync(`${__dirname}/../public/plugins.json`, JSON.stringify(pluginsInfo));

buildFiles.init(pluginNamesByAuthor, () => {
  // Project hub
  hub = new ProjectHub(io, paths.projects, (err: Error) => {
    if (err != null) { SupCore.log(`Failed to start server:\n${(<any>err).stack}`); return; }

    SupCore.log(`Loaded ${Object.keys(hub.serversById).length} projects from ${paths.projects}.`);

    let hostname = (config.password.length === 0) ? "localhost" : "";

    mainHttpServer.listen(config.mainPort, hostname, () => {
      buildHttpServer.listen(config.buildPort, hostname, () => {
        SupCore.log(`Main server started on port ${config.mainPort}, build server started on port ${config.buildPort}.`);
        if (hostname === "localhost") SupCore.log("NOTE: Setup a password to allow other people to connect to your server.");
      })
    });
  });
});

// Save on exit and handle crashes
let isQuitting = false;

function onExit() {
  if(isQuitting) return;
  isQuitting = true;
  mainHttpServer.close();
  buildHttpServer.close();

  SupCore.log("Saving all projects...");

  hub.saveAll((err: Error) => {
    if (err != null) SupCore.log(`Error while exiting:\n${(<any>err).stack}`);
    else SupCore.log("Exited cleanly.");
    process.exit();
  });
}

process.on("SIGINT", onExit);
process.on("message", (msg: string) => { if (msg === "stop") onExit(); });
