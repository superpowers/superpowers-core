import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as http from "http";
import * as express from "express";
import * as url from "url";
import * as socketio from "socket.io";

import passportMiddleware from "../passportMiddleware";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as expressSession from "express-session";
import * as passportSocketIo from "passport.socketio";

import * as config from "../config";
import * as schemas from "../schemas";
import getLocalizedFilename from "../getLocalizedFilename";
import * as SupCore from "../../SupCore";
import loadSystems from "../loadSystems";
import ProjectHub from "../ProjectHub";

// NOTE: We explicitly add core path to NODE_PATH so systems can load modules from core
process.env["NODE_PATH"] = path.resolve(`${__dirname}/../../node_modules`);
/* tslint:disable */
require("module").Module._initPaths();
/* tslint:enable */

let dataPath: string;
let hub: ProjectHub = null;
let mainApp: express.Express = null;
let mainHttpServer: http.Server;
let io: SocketIO.Server;
let buildApp: express.Express = null;
let buildHttpServer: http.Server;
let languageIds: string[];
let isQuitting = false;

function onUncaughtException(err: Error) {
  if (hub != null && hub.loadingProjectFolderName != null) {
    SupCore.log(`The server crashed while loading project "${hub.loadingProjectFolderName}".\n${(err as any).stack}`);
  } else {
    SupCore.log(`The server crashed.\n${(err as any).stack}`);
  }
  process.exit(1);
}

export default function start(serverDataPath: string) {
  dataPath = serverDataPath;
  SupCore.log(`Using data from ${dataPath}.`);
  process.on("uncaughtException", onUncaughtException);

  loadConfig();

  const { version, superpowers: { appApiVersion: appApiVersion } } = JSON.parse(fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" }));
  SupCore.log(`Server v${version} starting...`);
  fs.writeFileSync(`${__dirname}/../../public/superpowers.json`, JSON.stringify({ version, appApiVersion, hasPassword: config.server.password.length !== 0 }, null, 2));

  // SupCore
  (global as any).SupCore = SupCore;
  SupCore.systemsPath = path.join(dataPath, "systems");

  // List available languages
  languageIds = fs.readdirSync(`${__dirname}/../../public/locales`);
  languageIds.unshift("none");

  // Main HTTP server
  mainApp = express();

  if (typeof config.server.sessionSecret !== "string") throw new Error("serverConfig.sessionSecret is null");
  const sessionSettings = {
    name: "supSession",
    secret: config.server.sessionSecret,
    store: new expressSession.MemoryStore(),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }
  };

  mainApp.use(cookieParser());
  mainApp.use(bodyParser.urlencoded({ extended: false }));
  mainApp.use(handleLanguage);
  mainApp.use(expressSession(sessionSettings));
  mainApp.use(passportMiddleware.initialize());
  mainApp.use(passportMiddleware.session());

  mainApp.get("/", (req, res) => { res.redirect("/hub"); });

  mainApp.post("/login", passportMiddleware.authenticate("local", { successReturnToOrRedirect: "/", failureRedirect: "/login" }));
  mainApp.get("/login", serveLoginIndex);
  mainApp.get("/logout", (req, res) => { req.logout(); res.redirect("/"); });

  mainApp.get("/hub", enforceAuth, serveHubIndex);
  mainApp.get("/project", enforceAuth, serveProjectIndex);

  mainApp.use("/projects/:projectId/*", serveProjectWildcard);
  mainApp.use("/", express.static(`${__dirname}/../../public`));

  mainHttpServer = http.createServer(mainApp);
  mainHttpServer.on("error", onHttpServerError.bind(null, config.server.mainPort));

  io = socketio(mainHttpServer, { transports: [ "websocket" ] });
  io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: sessionSettings.name,
    secret: sessionSettings.secret,
    store: sessionSettings.store
  }));

  // Build HTTP server
  buildApp = express();

  buildApp.get("/", redirectToHub);
  buildApp.get("/systems/:systemId/SupCore.js", serveSystemSupCore);

  buildApp.use("/", express.static(`${__dirname}/../../public`));

  buildApp.use((req, res, next) => {
    const originValue = req.get("origin");
    if (originValue == null) { next(); return; }

    const origin = url.parse(originValue);
    if (origin.hostname === req.hostname && origin.port === config.server.mainPort.toString()) {
      res.header("Access-Control-Allow-Origin", originValue);
    }
    next();
  });

  buildApp.get("/builds/:projectId/:buildId/*", (req, res) => {
    const projectServer = hub.serversById[req.params.projectId];
    if (projectServer == null) { res.status(404).end("No such project"); return; }
    let buildId = req.params.buildId as string;
    if (buildId === "latest") buildId = (projectServer.nextBuildId - 1).toString();
    res.sendFile(path.join(projectServer.buildsPath, buildId, req.params[0]));
  });

  buildHttpServer = http.createServer(buildApp);
  buildHttpServer.on("error", onHttpServerError.bind(null, config.server.buildPort));

  loadSystems(mainApp, buildApp, onSystemsLoaded);

  // Save on exit and handle crashes
  process.on("SIGTERM", onExit);
  process.on("SIGINT", onExit);
  process.on("message", (msg: string) => { if (msg === "stop") onExit(); });
}

function loadConfig() {
  let mustWriteConfig = false;

  const serverConfigPath = `${dataPath}/config.json`;
  if (fs.existsSync(serverConfigPath)) {
    config.server = JSON.parse(fs.readFileSync(serverConfigPath, { encoding: "utf8" }));
    schemas.validate(config, "config");

    for (const key in config.defaults) {
      if (config.server[key] == null) config.server[key] = config.defaults[key];
    }
  } else {
    mustWriteConfig = true;
    config.server = {} as any;
    for (const key in config.defaults) config.server[key] = config.defaults[key];
  }

  if (config.server.sessionSecret == null) {
    config.server.sessionSecret = crypto.randomBytes(48).toString("hex");
    mustWriteConfig = true;
  }

  if (mustWriteConfig) {
    fs.writeFileSync(serverConfigPath, JSON.stringify(config.server, null, 2) + "\n", { encoding: "utf8" });
  }
}

function handleLanguage(req: express.Request, res: express.Response, next: Function) {
  if (req.cookies["supLanguage"] == null) {
    let languageCode = req.header("Accept-Language");

    if (languageCode != null) {
      languageCode = languageCode.split(",")[0];
      if (languageIds.indexOf(languageCode) === -1 && languageCode.indexOf("-") !== -1) {
        languageCode = languageCode.split("-")[0];
      }
    }

    if (languageIds.indexOf(languageCode) === -1) languageCode = "en";
    res.cookie("supLanguage", languageCode);
  }

  next();
}

function enforceAuth(req: express.Request, res: express.Response, next: Function) {
  if (!req.isAuthenticated()) {
    req.session["returnTo"] = req.originalUrl;
    res.redirect(`/login`);
    return;
  }

  next();
}

function serveHubIndex(req: express.Request, res: express.Response) {
  const localizedIndex = getLocalizedFilename("index.html", req.cookies["supLanguage"]);
  res.sendFile(path.resolve(`${__dirname}/../../public/hub/${localizedIndex}`));
}

function serveProjectIndex(req: express.Request, res: express.Response) {
  const localizedIndex = getLocalizedFilename("index.html", req.cookies["supLanguage"]);
  res.sendFile(path.resolve(`${__dirname}/../../public/project/${localizedIndex}`));
}

function serveLoginIndex(req: express.Request, res: express.Response) {
  const localizedIndex = getLocalizedFilename("index.html", req.cookies["supLanguage"]);
  res.sendFile(path.resolve(`${__dirname}/../../public/login/${localizedIndex}`));
}

function serveProjectWildcard(req: express.Request, res: express.Response) {
  const projectPath = hub.serversById[req.params.projectId].projectPath;

  res.sendFile(req.params[0], { root: `${projectPath}/public` }, (err) => {
    if (req.params[0] === "icon.png") res.sendFile("/images/default-project-icon.png", { root: `${__dirname}/../../public` });
  });
}

function onHttpServerError(port: number, err: NodeJS.ErrnoException) {
  if (err.code === "EADDRINUSE") {
    SupCore.log(`Could not start the server: another application is already listening on port ${port}.`);
    process.exit(1);
  } else throw(err);
}

function redirectToHub(req: express.Request, res: express.Response) {
  res.redirect(`http://${req.hostname}:${config.server.mainPort}/hub/`);
}

function serveSystemSupCore(req: express.Request, res: express.Response) {
  res.sendFile("SupCore.js", { root: `${__dirname}/../../public` });
}

function onSystemsLoaded() {
  mainApp.use(handle404);
  buildApp.use(handle404);

  // Project hub
  hub = new ProjectHub(io, dataPath, (err: Error) => {
    if (err != null) { SupCore.log(`Failed to start server:\n${(err as any).stack}`); return; }

    SupCore.log(`Loaded ${Object.keys(hub.serversById).length} projects from ${hub.projectsPath}.`);

    const hostname = (config.server.password.length === 0) ? "localhost" : "";

    mainHttpServer.listen(config.server.mainPort, hostname, () => {
      buildHttpServer.listen(config.server.buildPort, hostname, () => {
        SupCore.log(`Main server started on port ${config.server.mainPort}, build server started on port ${config.server.buildPort}.`);
        if (hostname === "localhost") SupCore.log("NOTE: Setup a password to allow other people to connect to your server.");
        if (process != null && process.send != null) process.send({ type: "started" });
      });
    });
  });
}

function handle404(err: any, req: express.Request, res: express.Response, next: Function) {
  if (err.status === 404) { res.status(404).end("File not found"); return; }
  next();
}

function onExit() {
  if (isQuitting) return;
  isQuitting = true;
  mainHttpServer.close();
  buildHttpServer.close();

  if (hub == null) {
    process.exit(0);
    return;
  }

  SupCore.log("Saving all projects...");

  hub.saveAll((err: Error) => {
    if (err != null) SupCore.log(`Error while exiting:\n${(err as any).stack}`);
    else SupCore.log("Exited cleanly.");
    process.exit(0);
  });
}
