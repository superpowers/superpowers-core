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

export default function start() {
  // Globals
  (global as any).SupCore = SupCore;

  const { version, superpowers: { appApiVersion: appApiVersion } } = JSON.parse(fs.readFileSync(`${__dirname}/../package.json`, { encoding: "utf8" }));
  SupCore.log(`Using data from ${paths.userData}.`);
  SupCore.log(`Server v${version} starting...`);

  function handle404(err: any, req: express.Request, res: express.Response, next: Function) {
    if (err.status === 404) { res.status(404).end("File not found"); return; }
    next();
  }

  let hub: ProjectHub = null;

  process.on("uncaughtException", (err: Error) => {
    if (hub != null && hub.loadingProjectFolderName != null) {
      SupCore.log(`The server crashed while loading project "${hub.loadingProjectFolderName}".\n${(err as any).stack}`);
    } else {
      SupCore.log(`The server crashed.\n${(err as any).stack}`);
    }
    process.exit(1);
  });


  // Public version
  fs.writeFileSync(`${__dirname}/../public/superpowers.json`, JSON.stringify({ version, appApiVersion, hasPassword: config.password.length !== 0 }, null, 2));

  // Main HTTP server
  const mainApp = express();

  const languageIds = fs.readdirSync(`${__dirname}/../public/locales`);
  languageIds.unshift("none");

  mainApp.use(cookieParser());
  mainApp.use((req, res, next) => {
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
  mainApp.get("/hub", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "hub", paths.getLocalizedFilename("index.html", req.cookies["supLanguage"])));
  });
  mainApp.get("/project", redirectIfNoAuth);
  mainApp.get("/project", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "project", paths.getLocalizedFilename("index.html", req.cookies["supLanguage"])));
  });
  mainApp.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "login", paths.getLocalizedFilename("index.html", req.cookies["supLanguage"])));
  });

  mainApp.use("/", express.static(`${__dirname}/../public`));
  mainApp.use("/projects/:projectId/*", (req, res) => {
    const projectPath = hub.serversById[req.params.projectId].projectPath;

    res.sendFile(req.params[0], { root: `${projectPath}/public` }, (err) => {
      if (req.params[0] === "icon.png") res.sendFile("/images/default-project-icon.png", { root: `${__dirname}/../public` });
    });
  });

  const mainHttpServer = http.createServer(mainApp);
  mainHttpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      SupCore.log(`Could not start the server: another application is already listening on port ${config.mainPort}.`);
      process.exit(1);
    } else throw(err);
  });

  const io = socketio(mainHttpServer, { transports: ["websocket"] });

  // Build HTTP server
  const buildApp = express();

  function redirectToHub(req: express.Request, res: express.Response) {
    res.redirect(`http://${req.hostname}:${config.mainPort}/hub/`);
  }

  buildApp.get("/", redirectToHub);
  buildApp.get("/systems/:systemId/SupCore.js", (req, res) => {
    res.sendFile("SupCore.js", { root: `${__dirname}/../public` });
  });

  buildApp.use("/", express.static(`${__dirname}/../public`));

  buildApp.get("/builds/:projectId/:buildId/*", (req, res) => {
    const projectServer = hub.serversById[req.params.projectId];
    if (projectServer == null) { res.status(404).end("No such project"); return; }
    let buildId = req.params.buildId as string;
    if (buildId === "latest") buildId = (projectServer.nextBuildId - 1).toString();
    res.sendFile(path.join(projectServer.buildsPath, buildId, req.params[0]));
  });

  const buildHttpServer = http.createServer(buildApp);

  loadSystems(mainApp, buildApp, () => {
    mainApp.use(handle404);
    buildApp.use(handle404);

    // Project hub
    hub = new ProjectHub(io, (err: Error) => {
      if (err != null) { SupCore.log(`Failed to start server:\n${(err as any).stack}`); return; }

      SupCore.log(`Loaded ${Object.keys(hub.serversById).length} projects from ${paths.projects}.`);

      const hostname = (config.password.length === 0) ? "localhost" : "";

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
      if (err != null) SupCore.log(`Error while exiting:\n${(err as any).stack}`);
      else SupCore.log("Exited cleanly.");
      process.exit(0);
    });
  }

  process.on("SIGINT", onExit);
  process.on("message", (msg: string) => { if (msg === "stop") onExit(); });
}
