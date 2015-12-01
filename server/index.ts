/// <reference path="index.d.ts" />

import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import * as socketio from "socket.io";

import * as paths from "./paths";
import config from "./config";
import * as SupCore from "../SupCore";
import loadSystems from "./loadSystems";
import ProjectHub from "./ProjectHub";

// Globals
(<any>global).SupCore = SupCore;

let { version, superpowers: { appApiVersion: appApiVersion } } = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, { encoding: "utf8" }));
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

// Public version
fs.writeFileSync(`${__dirname}/../public/superpowers.json`, JSON.stringify({ version, appApiVersion }, null, 2));

// Main HTTP server
let mainApp = express();

mainApp.use(cookieParser());
mainApp.use((req, res, next) => {
  if (req.cookies["language"] == null) {
    let language = req.header("Accept-Language").split(",")[0].split("-")[0];
    if (SupCore.languages[language] == null) language = "en";
    res.cookie("language", language);
  }
  next();
});

function redirectIfNoAuth(req: express.Request, res: express.Response, next: Function) {
  if (req.cookies["supServerAuth"] == null) {
    res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    return;
  }

  next();
}

mainApp.get("/", (req, res) => { res.redirect("/hub"); });
mainApp.get("/hub", redirectIfNoAuth);
mainApp.get("/project", redirectIfNoAuth);

mainApp.use("/", express.static(`${__dirname}/../public`));
mainApp.use("/projects/:projectId/*", (req, res) => {
  let projectPath = hub.serversById[req.params.projectId].projectPath;

  res.sendFile(req.params[0], { root: `${projectPath}/public` }, (err) => {
    if (req.params[0] === "icon.png") res.sendFile("/images/default-project-icon.png", { root: `${__dirname}/../public` });
  });
});

let mainHttpServer = http.createServer(mainApp);
mainHttpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    SupCore.log(`Could not start the server: another application is already listening on port ${config.mainPort}.`);
    process.exit(1);
  } else throw(err);
});

let io = socketio(mainHttpServer, { transports: ["websocket"] });

// Build HTTP server
let buildApp = express();

function redirectToHub(req: express.Request, res: express.Response) {
  res.redirect(`http://${req.hostname}:${config.mainPort}/hub/`);
}

buildApp.get("/", redirectToHub);
buildApp.get("/systems/:systemName/SupCore.js", (req, res) => {
  res.sendFile("SupCore.js", { root: `${__dirname}/../public` });
});

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
    process.exit(0);
  });
}

process.on("SIGINT", onExit);
process.on("message", (msg: string) => { if (msg === "stop") onExit(); });
