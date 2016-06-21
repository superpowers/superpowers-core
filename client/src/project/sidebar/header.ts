import { entries } from "../network";
import * as entriesTreeView from "./entriesTreeView";

import StartBuildDialog from "./StartBuildDialog";

export function start() {
  if (SupClient.query.project == null) goToHub();

  document.querySelector(".project-icon .go-to-hub").addEventListener("click", () => { goToHub(); });
  document.querySelector(".project-buttons .build").addEventListener("click", () => { openStartBuildDialog(); });
  // TODO(run)
  /*document.querySelector(".project-buttons .run").addEventListener("click", () => { runProject(); });
  document.querySelector(".project-buttons .debug").addEventListener("click", () => { runProject({ debug: true }); });
  document.querySelector(".project-buttons .stop").addEventListener("click", () => { stopProject(); });

  if (SupApp == null) {
    (document.querySelector(".project-buttons .build") as HTMLButtonElement).title = SupClient.i18n.t("project:header.buildDisabled");
    (document.querySelector(".project-buttons .debug") as HTMLButtonElement).hidden = true;
    (document.querySelector(".project-buttons .stop") as HTMLButtonElement).hidden = true;
  }*/
}

export function enable() {
  // TODO(run)
  /*(document.querySelector(".project-buttons .run") as HTMLButtonElement).disabled = false;
  (document.querySelector(".project-buttons .debug") as HTMLButtonElement).disabled = false;*/
  (document.querySelector(".project-buttons .build") as HTMLButtonElement).disabled = false;
}

export function disable() {
  // TODO(run)
  /*(document.querySelector(".project-buttons .run") as HTMLButtonElement).disabled = true;
  (document.querySelector(".project-buttons .debug") as HTMLButtonElement).disabled = true;*/
  (document.querySelector(".project-buttons .build") as HTMLButtonElement).disabled = true;
}

function goToHub() {
  if (SupApp != null) SupApp.showMainWindow();
  else window.location.replace("/");
}

// TODO(run)
/*
let runWindow: GitHubElectron.BrowserWindow;

if (SupApp != null) {
  window.addEventListener("beforeunload", () => {
    if (runWindow != null) runWindow.removeListener("closed", onCloseRunWindow);
  });
}

function runProject(options: { debug: boolean; } = { debug: false }) {
  if (SupApp != null) {
    if (runWindow == null) {
      runWindow = SupApp.openWindow(`${window.location.origin}/build.html`);
      runWindow.setMenuBarVisibility(false);
      runWindow.on("closed", onCloseRunWindow);

      (document.querySelector(".project-buttons") as HTMLDivElement).classList.toggle("running", true);
    }
    runWindow.show();
    runWindow.focus();

    (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = false;
  } else window.open("/build.html", `player_${SupClient.query.project}`);

  socket.emit("build:project", (err: string, buildId: string) => {
    if (err != null) {
      // tslint:disable:no-unused-expression
      new SupClient.Dialogs.InfoDialog(err);
      // tslint:enable:no-unused-expression
      return;
    }

    let url = `${window.location.protocol}//${window.location.hostname}:${buildPort}/systems/${SupCore.system.id}/?project=${SupClient.query.project}&build=${buildId}`;
    if (options.debug) url += "&debug";

    if (SupApp != null) {
      if (runWindow != null) runWindow.loadURL(url);
    } else window.open(url, `player_${SupClient.query.project}`);
  });
}

function onCloseRunWindow() {
  runWindow = null;
  (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = true;
}

function stopProject() {
  runWindow.destroy();
  runWindow = null;

  (document.querySelector(".project-buttons .stop") as HTMLButtonElement).disabled = true;
}
*/

function openStartBuildDialog() {
  /* tslint:disable:no-unused-expression */
  new StartBuildDialog(entries, entriesTreeView.widget, (buildSetup) => {
    /* tslint:enable:no-unused-expression */
    if (buildSetup == null) return;

    const buildWindow = SupApp.openWindow(`${window.location.origin}/build/?project=${SupClient.query.project}`, { size: { width: 600, height: 150 }, resizable: false });
    buildWindow.webContents.addListener("did-finish-load", () => {
      buildWindow.webContents.send("build", buildSetup);
    });
  });
}
