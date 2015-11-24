import * as config from "./config";

let path = nodeRequire("path");
let childProcess = nodeRequire("child_process");

let myServerElt = document.querySelector(".my-server");

let myServerTextarea = <HTMLTextAreaElement>myServerElt.querySelector("textarea");
export let serverProcess: any = null;

let autoStartServerCheckbox = <HTMLInputElement>document.getElementById("auto-start-server");
autoStartServerCheckbox.checked = config.autoStartServer;

autoStartServerCheckbox.addEventListener("change", (event) => {
  config.autoStartServer = autoStartServerCheckbox.checked;
});

let startStopServerButton = <HTMLButtonElement>myServerElt.querySelector("button.start-stop-server");
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
  serverProcess = childProcess.fork(serverPath, { silent: true, env: { "ATOM_SHELL_INTERNAL_RUN_AS_NODE": 1 } });
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
