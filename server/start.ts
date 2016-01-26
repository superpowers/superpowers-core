import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import * as express from "express";
import * as cookieParser from "cookie-parser";
import * as socketio from "socket.io";

import * as config from "./config";
import * as schemas from "./schemas";
import getLocalizedFilename from "./getLocalizedFilename";
import * as SupCore from "../SupCore";
import loadSystems from "./loadSystems";
import ProjectHub from "./ProjectHub";

import * as mkdirp from "mkdirp";

let userDataPath: string;
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

export default function start(customUserDataPath: string) {
  setupUserData(customUserDataPath);
  SupCore.log(`Using data from ${userDataPath}.`);
  process.on("uncaughtException", onUncaughtException);

  loadConfig();

  const { version, superpowers: { appApiVersion: appApiVersion } } = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, { encoding: "utf8" }));
  SupCore.log(`Server v${version} starting...`);
  fs.writeFileSync(`${__dirname}/../public/superpowers.json`, JSON.stringify({ version, appApiVersion, hasPassword: config.server.password.length !== 0 }, null, 2));

  (global as any).SupCore = SupCore;

  languageIds = fs.readdirSync(`${__dirname}/../public/locales`);
  languageIds.unshift("none");

  // Main HTTP server
  mainApp = express();

  mainApp.use(cookieParser());
  mainApp.use(handleLanguage);

  mainApp.get("/", (req, res) => { res.redirect("/hub"); });
  mainApp.get("/login", serveLoginIndex);
  mainApp.get("/hub", enforceAuth, serveHubIndex);
  mainApp.get("/project", enforceAuth, serveProjectIndex);

  mainApp.use("/projects/:projectId/*", serveProjectWildcard);
  mainApp.use("/", express.static(`${__dirname}/../public`));

  mainHttpServer = http.createServer(mainApp);
  mainHttpServer.on("error", onHttpServerError.bind(null, config.server.mainPort));

  io = socketio(mainHttpServer, { transports: [ "websocket" ] });

  // Build HTTP server
  buildApp = express();

  buildApp.get("/", redirectToHub);
  buildApp.get("/systems/:systemId/SupCore.js", serveSystemSupCore);

  buildApp.use("/", express.static(`${__dirname}/../public`));

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
  process.on("SIGINT", onExit);
  process.on("message", (msg: string) => { if (msg === "stop") onExit(); });
}

function setupUserData(customUserDataPath: string) {
  if (customUserDataPath != null) {
    userDataPath = path.resolve(customUserDataPath);
  } else {
    userDataPath = path.resolve(path.join(__dirname, ".."));

    if (!fs.existsSync(path.join(userDataPath, "config.json"))) {
      switch (process.platform) {
        case "win32":
          if (process.env.APPDATA != null) userDataPath = path.join(process.env.APPDATA, "Superpowers");
          else SupCore.log("Warning: Could not find APPDATA environment variable.");
          break;
        case "darwin":
          if (process.env.HOME != null) userDataPath = path.join(process.env.HOME, "Library", "Superpowers");
          else SupCore.log("Warning: Could not find HOME environment variable.");
          break;
        default:
          if (process.env.XDG_DATA_HOME != null) userDataPath = path.join(process.env.XDG_DATA_HOME, "Superpowers");
          else if (process.env.HOME != null) userDataPath = path.join(process.env.HOME, ".local/share", "Superpowers");
          else SupCore.log("Warning: Could not find neither XDG_DATA_HOME nor HOME environment variables.");
      }
    }
  }

  try { mkdirp.sync(userDataPath); } catch (err) { if (err.code !== "EEXIST") throw err; }
  try { mkdirp.sync(path.join(userDataPath, "projects")); } catch (err) { if (err.code !== "EEXIST") throw err; }
  try { mkdirp.sync(path.join(userDataPath, "builds")); } catch (err) { if (err.code !== "EEXIST") throw err; }

  return userDataPath;
}

function loadConfig() {
  const serverConfigPath = `${userDataPath}/config.json`;
  if (fs.existsSync(serverConfigPath)) {
    config.server = JSON.parse(fs.readFileSync(serverConfigPath, { encoding: "utf8" }));
    schemas.validate(config, "config");

    for (const key in config.defaults) {
      if (config.server[key] == null) config.server[key] = config.defaults[key];
    }
  } else {
    fs.writeFileSync(serverConfigPath, JSON.stringify(config.defaults, null, 2) + "\n", { encoding: "utf8" });
  }
}

function handleLanguage(req: express.Request, res: express.Response, next: Function) {
  if (req.cookies["supLanguage"] == null) {
    let language = req.header("Accept-Language");

    if (language != null) {
      language = language.split(",")[0];
      if (languageIds.indexOf(language) === -1 && language.indexOf("-") !== -1) {
        language = language.split("-")[0];
      }
    }

    if (languageIds.indexOf(language) === -1) language = "en";
    res.cookie("supLanguage", language);
  }

  next();
}

function enforceAuth(req: express.Request, res: express.Response, next: Function) {
  if (req.cookies["supServerAuth"] == null) {
    res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    return;
  }

  next();
}

function serveHubIndex(req: express.Request, res: express.Response) {
  const localizedIndex = getLocalizedFilename("index.html", req.cookies["supLanguage"]);
  res.sendFile(path.resolve(`${__dirname}/../public/hub/${localizedIndex}`));
}

function serveProjectIndex(req: express.Request, res: express.Response) {
  const localizedIndex = getLocalizedFilename("index.html", req.cookies["supLanguage"]);
  res.sendFile(path.resolve(`${__dirname}/../public/project/${localizedIndex}`));
}

function serveLoginIndex(req: express.Request, res: express.Response) {
  const localizedIndex = getLocalizedFilename("index.html", req.cookies["supLanguage"]);
  res.sendFile(path.resolve(`${__dirname}/../public/login/${localizedIndex}`));
}

function serveProjectWildcard(req: express.Request, res: express.Response) {
  const projectPath = hub.serversById[req.params.projectId].projectPath;

  res.sendFile(req.params[0], { root: `${projectPath}/public` }, (err) => {
    if (req.params[0] === "icon.png") res.sendFile("/images/default-project-icon.png", { root: `${__dirname}/../public` });
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
  res.sendFile("SupCore.js", { root: `${__dirname}/../public` });
}

function onSystemsLoaded() {
  mainApp.use(handle404);
  buildApp.use(handle404);

  // Project hub
  hub = new ProjectHub(io, userDataPath, (err: Error) => {
    if (err != null) { SupCore.log(`Failed to start server:\n${(err as any).stack}`); return; }

    SupCore.log(`Loaded ${Object.keys(hub.serversById).length} projects from ${hub.projectsPath}.`);

    const hostname = (config.server.password.length === 0) ? "localhost" : "";

    mainHttpServer.listen(config.server.mainPort, hostname, () => {
      buildHttpServer.listen(config.server.buildPort, hostname, () => {
        SupCore.log(`Main server started on port ${config.server.mainPort}, build server started on port ${config.server.buildPort}.`);
        if (hostname === "localhost") SupCore.log("NOTE: Setup a password to allow other people to connect to your server.");
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
