import * as network from "./network";
import * as sidebar from "./sidebar";
import { onNewAssetClick, onNewFolderClick, onSearchEntryDialog, onToggleFilterStripClick } from "./sidebar/entriesTreeView/buttonCallbacks";
import * as tabs from "./tabs";
import * as tabsAssets from "./tabs/assets";
import * as tabsTools from "./tabs/tools";
import * as homeTab from "./tabs/homeTab";

function start() {
  document.body.hidden = false;

  // Development mode
  if (localStorage.getItem("superpowers-dev-mode") != null) {
    const projectManagementDiv = document.querySelector(".project-management") as HTMLDivElement;
    projectManagementDiv.style.backgroundColor = "#37d";

    // According to http://stackoverflow.com/a/12747364/915914, window.onerror
    // should be used rather than window.addEventListener("error", ...);
    // to get all errors, including syntax errors.
    window.onerror = onWindowDevError;
  }

  // Global controls
  const toggleNotificationsButton = document.querySelector(".top .controls button.toggle-notifications") as HTMLButtonElement;
  toggleNotificationsButton.addEventListener("click", onClickToggleNotifications);

  if (localStorage.getItem("superpowers-disable-notifications") != null) {
    toggleNotificationsButton.classList.add("disabled");
    toggleNotificationsButton.title = SupClient.i18n.t("project:header.notifications.enable");
  } else {
    toggleNotificationsButton.classList.remove("disabled");
    toggleNotificationsButton.title = SupClient.i18n.t("project:header.notifications.disable");
  }

  sidebar.start();
  tabs.start();
  network.connect();
}
SupClient.i18n.load([{ root: "/", name: "project" }, { root: "/", name: "badges" }], start);

window.addEventListener("message", onMessage);
function onMessage(event: any) {
  switch(event.data.type) {
    case "chat": homeTab.onMessageChat(event.data.content); break;
    case "hotkey": onMessageHotKey(event.data.content); break;
    case "openEntry": tabsAssets.open(event.data.id, event.data.state); break;
    case "openTool": tabsTools.open(event.data.name, event.data.state); break;
    case "error": onWindowDevError(); break;
  }
}

function onWindowDevError() {
  const projectManagementDiv = document.querySelector(".project-management") as HTMLDivElement;
  projectManagementDiv.style.backgroundColor = "#c42";
  return false;
}

function onMessageHotKey(action: string) {
  switch (action) {
    case "newAsset":     onNewAssetClick(); break;
    case "newFolder":    onNewFolderClick(); break;
    case "searchEntry":  onSearchEntryDialog(); break;
    case "filter":       onToggleFilterStripClick(); break;
    case "closeTab":     tabs.onClose(); break;
    case "previousTab":  tabs.onActivatePrevious(); break;
    case "nextTab":      tabs.onActivateNext(); break;
    // TODO(run)
    /*case "run":          runProject(); break;
    case "debug":        runProject({ debug: true }); break;*/
    case "devtools":     if (SupApp != null) SupApp.getCurrentWindow().webContents.toggleDevTools(); break;
  }
}

function onClickToggleNotifications(event: any) {
  let notificationsDisabled = (localStorage.getItem("superpowers-disable-notifications") != null) ? true : false;
  notificationsDisabled = !notificationsDisabled;

  if (!notificationsDisabled) {
    localStorage.removeItem("superpowers-disable-notifications");
    event.target.classList.remove("disabled");
    event.target.title = SupClient.i18n.t("project:header.notifications.disable");
  } else {
    localStorage.setItem("superpowers-disable-notifications", "true");
    event.target.classList.add("disabled");
    event.target.title = SupClient.i18n.t("project:header.notifications.enable");
  }
}
