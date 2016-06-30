import { socket, entries, buildPort, supportsServerBuild } from "../network";
import * as entriesTreeView from "./entriesTreeView";

import StartBuildDialog from "./StartBuildDialog";

const projectButtons = document.querySelector(".project-buttons") as HTMLDivElement;

const runButton = projectButtons.querySelector(".run") as HTMLButtonElement;
const debugButton = projectButtons.querySelector(".debug") as HTMLButtonElement;
const stopButton = projectButtons.querySelector(".stop") as HTMLButtonElement;
const buildButton = projectButtons.querySelector(".build") as HTMLButtonElement;

export function start() {
  if (SupClient.query.project == null) goToHub();

  document.querySelector(".project-icon .go-to-hub").addEventListener("click", () => { goToHub(); });
  buildButton.addEventListener("click", () => { openStartBuildDialog(); });
  runButton.addEventListener("click", () => { runProject(); });
  debugButton.addEventListener("click", () => { runProject({ debug: true }); });
  stopButton.addEventListener("click", () => { stopProject(); });

  if (SupApp == null) buildButton.title = SupClient.i18n.t("project:header.buildDisabled");
}

export function enable() {
  runButton.hidden = !supportsServerBuild;
  debugButton.hidden = !supportsServerBuild || SupApp == null;
  stopButton.hidden = !supportsServerBuild || SupApp == null;
  projectButtons.hidden = false;

  runButton.disabled = false;
  debugButton.disabled = false;
  buildButton.disabled = SupApp == null;
}

export function disable() {
  runButton.disabled = true;
  debugButton.disabled = true;
  buildButton.disabled = true;
}

function goToHub() {
  if (SupApp != null) SupApp.showMainWindow();
  else window.location.replace("/");
}

let runWindow: Electron.BrowserWindow;
let runWindowDestroyTimeout: NodeJS.Timer;

if (SupApp != null) {
  window.addEventListener("beforeunload", () => {
    if (runWindow != null) runWindow.removeListener("closed", onCloseRunWindow);
  });
}

export function runProject(options: { debug: boolean; } = { debug: false }) {
if (runButton.hidden || runButton.disabled) return;

  if (SupApp != null) {
    if (runWindow == null) {
      runWindow = SupApp.openWindow(`${window.location.origin}/build.html`);
      runWindow.setMenuBarVisibility(false);
      runWindow.on("closed", onCloseRunWindow);

      (document.querySelector(".project-buttons") as HTMLDivElement).classList.toggle("running", true);
    }
    runWindow.show();
    runWindow.focus();

    stopButton.disabled = false;
  } else window.open("/build.html", `player_${SupClient.query.project}`);

  socket.emit("build:project", (err: string, buildId: string) => {
    if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }

    let url = `${window.location.protocol}//${window.location.hostname}:${buildPort}/systems/${SupCore.system.id}/?project=${SupClient.query.project}&build=${buildId}`;
    if (options.debug) url += "&debug";

    if (SupApp != null) {
      if (runWindow != null) runWindow.loadURL(url);
    } else window.open(url, `player_${SupClient.query.project}`);
  });
}

function onCloseRunWindow() {
  runWindow = null;
  if (runWindowDestroyTimeout != null) {
    clearTimeout(runWindowDestroyTimeout);
    runWindowDestroyTimeout = null;
  }
  stopButton.disabled = true;
}

function stopProject() {
  stopButton.disabled = true;

  // Send a message to ask the window to exit gracefully
  // So that it has a chance to clean things up
  runWindow.webContents.send("forceQuit");

  // If it doesn't, destroy it
  runWindowDestroyTimeout = setTimeout(destroyRunWindow, 500);
}

function destroyRunWindow() {
  runWindowDestroyTimeout = null;
  if (runWindow != null) {
    runWindow.destroy();
    runWindow = null;
  }
}

function openStartBuildDialog() {
  new StartBuildDialog(entries, entriesTreeView.widget, (buildSetup) => {
    if (buildSetup == null) return;

    const buildWindow = SupApp.openWindow(`${window.location.origin}/build/?project=${SupClient.query.project}`, { size: { width: 600, height: 150 }, resizable: false });
    buildWindow.webContents.addListener("did-finish-load", () => {
      buildWindow.webContents.send("build", buildSetup);
    });
  });
}
