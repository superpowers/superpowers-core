/// <reference path="index.d.ts" />

import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import * as querystring from "querystring";
import * as express from "express";
import * as socketio from "socket.io";

import * as paths from "./paths";
import config from "./config";
import * as SupCore from "../SupCore";
import loadSystems from "./loadSystems";
import ProjectHub from "./ProjectHub";

// Globals
(<any>global).SupCore = SupCore;

let { version } = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, { encoding: "utf8" }));
SupCore.log(`Server v${version} starting...`);

process.on("uncaughtException", (err: Error) => {
  SupCore.log(`The server crashed.\n${(<any>err).stack}`);
  process.exit(1);
});

function handle404(err: any, req: express.Request, res: express.Response, next: Function) {
  if (err.status === 404) { res.status(404).end("File not found"); return; }
  next();
}

let hub: ProjectHub = null;

// Main HTTP server
let mainApp = express();
mainApp.use("/", express.static(`${__dirname}/../public`));
mainApp.use("/projects/:projectId/*", (req, res) => {
  let projectPath = hub.serversById[req.params.projectId].projectPath;
  res.sendFile(req.params[0], { root: `${projectPath}/public` });
});

let mainHttpServer = http.createServer(mainApp);
mainHttpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    SupCore.log(`Could not start the server: another application is already listening on port ${config.mainPort}.`);
    process.exit();
  } else throw(err);
});

let io = socketio(mainHttpServer, { transports: ["websocket"] });

// Build HTTP server
let buildApp = express();

function redirectToMainApp(req: express.Request, res: express.Response) {
  res.redirect(`http://${req.hostname}:${config.mainPort}/?${querystring.stringify(req.query)}`);
}

buildApp.get("/", redirectToMainApp);
buildApp.use("/", express.static(`${__dirname}/../public`));

buildApp.get("/builds/:projectId/:buildId/*", (req, res) => {
  let projectServer = hub.serversById[req.params.projectId];
  if (projectServer == null) { res.status(404).end("No such project"); return; }
  res.sendFile(path.join(projectServer.buildsPath, req.params.buildId, req.params[0]));
});

let buildHttpServer = http.createServer(buildApp);

loadSystems(mainApp, buildApp, () => {
  mainApp.use(handle404);
  buildApp.use(handle404);

  // Project hub
  hub = new ProjectHub(io, (err: Error) => {
    if (err != null) { SupCore.log(`Failed to start server:\n${(<any>err).stack}`); return; }

    SupCore.log(`Loaded ${Object.keys(hub.serversById).length} projects from ${paths.projects}.`);

    let hostname = (config.password.length === 0) ? "localhost" : "";

    mainHttpServer.listen(config.mainPort, hostname, () => {
      buildHttpServer.listen(config.buildPort, hostname, () => {
        SupCore.log(`Main server started on port ${config.mainPort}, build server started on port ${config.buildPort}.`);
        if (hostname === "localhost") SupCore.log("NOTE: Setup a password to allow other people to connect to your server.");
      });
    });
  });
});

// Save on exit and handle crashes
let isQuitting = false;

function onExit() {
  if (isQuitting) return;
  isQuitting = true;
  mainHttpServer.close();
  buildHttpServer.close();

  SupCore.log("Saving all projects...");

  hub.saveAll((err: Error) => {
    if (err != null) SupCore.log(`Error while exiting:\n${(<any>err).stack}`);
    else SupCore.log("Exited cleanly.");
    process.exit();
  });
  
  process.exit;
}

process.on("SIGINT", onExit);
process.on("message", (msg: string) => { if (msg === "stop") onExit(); });
