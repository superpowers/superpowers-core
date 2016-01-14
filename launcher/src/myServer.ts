let electron: GitHubElectron.Electron = nodeRequire("electron");
import * as config from "./config";
import * as dummy_childProcess from "child_process";
import { userData } from "./panes/serverPaths";

let path = nodeRequire("path");
let childProcess = nodeRequire("child_process");

let myServerElt = document.querySelector(".my-server");

let myServerTextarea = myServerElt.querySelector("textarea") as HTMLTextAreaElement;
export let serverProcess: dummy_childProcess.ChildProcess = null;

let autoStartServerCheckbox = document.getElementById("auto-start-server") as HTMLInputElement;
autoStartServerCheckbox.checked = config.autoStartServer;

autoStartServerCheckbox.addEventListener("change", (event) => {
  config.autoStartServer = autoStartServerCheckbox.checked;
});

let startStopServerButton = myServerElt.querySelector("button.start-stop-server") as HTMLButtonElement;
startStopServerButton.addEventListener("click", () => {
  if (serverProcess != null) {
    startStopServerButton.textContent = "Start";
    startStopServerButton.disabled = true;
    serverProcess.send("stop");
    return;
  }

  startServer();
});

function startServer() {
  startStopServerButton.textContent = "Stop";

  let serverPath = path.join(path.resolve(path.dirname(nodeProcess.mainModule.filename)), "../../server/index.js");

  let serverEnv: { [key: string]: string; } = {};
  serverEnv["ELECTRON_RUN_AS_NODE"] = "1";
  serverEnv["ELECTRON_NO_ATTACH_CONSOLE"] = "1";

  // NOTE: It would be nice to simply copy all environment variables
  // but somehow, this prevents Electron 0.35.1 from starting the server
  // for (let key in nodeProcess.env) serverEnv[key] = nodeProcess.env[key];

  // So instead, we'll just copy the environment variables we definitely need
  if (nodeProcess.env["NODE_ENV"] != null) serverEnv["NODE_ENV"] = nodeProcess.env["NODE_ENV"];
  if (nodeProcess.env["APPDATA"] != null) serverEnv["APPDATA"] = nodeProcess.env["APPDATA"];
  if (nodeProcess.env["HOME"] != null) serverEnv["HOME"] = nodeProcess.env["HOME"];
  if (nodeProcess.env["XDG_DATA_HOME"] != null) serverEnv["XDG_DATA_HOME"] = nodeProcess.env["XDG_DATA_HOME"];

  serverProcess = childProcess.fork(serverPath, { silent: true, env: serverEnv });
  serverProcess.on("exit", () => {
    serverProcess = null;
    startStopServerButton.disabled = false;
    startStopServerButton.textContent = "Start";
    myServerTextarea.value += "\n";
  });

  serverProcess.on("message", (msg: string) => {
    myServerTextarea.value += `${msg}\n`;
    setTimeout(() => { myServerTextarea.scrollTop = myServerTextarea.scrollHeight; }, 0);
  });
}

if (config.autoStartServer) startServer();

myServerElt.querySelector("button.open-projects").addEventListener("click", () => {
  electron.shell.showItemInFolder(path.join(userData, "projects"));
});
