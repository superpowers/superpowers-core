import * as config from "./config";

let remote: GitHubElectron.Remote = nodeRequire("remote");
let currentWindow = remote.getCurrentWindow();

let path = nodeRequire("path");
let child_process = nodeRequire("child_process");

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
  serverProcess = child_process.fork(serverPath, { silent: true });
  serverProcess.on("exit", () => {
    console.log("server closed");
    serverProcess = null;
    startStopServerButton.disabled = false;
    startStopServerButton.textContent = "Start";
    myServerTextarea.value += "\n";

    //if (config.hasRequestedClose) currentWindow.close();
  });

  serverProcess.on("message", (msg: string) => {
    myServerTextarea.value += `${msg}\n`;
    setTimeout(() => { myServerTextarea.scrollTop = myServerTextarea.scrollHeight; }, 0);
  });
}

if (config.autoStartServer) startServer();
