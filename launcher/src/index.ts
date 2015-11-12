/// <reference path="index.d.ts" />

import "./panes";
import "./splash";
import * as myServer from "./myServer";
import * as config from "./config";

let remote: GitHubElectron.Remote = nodeRequire("remote");
let currentWindow = remote.getCurrentWindow();

document.querySelector(".controls .minimize").addEventListener("click", () => { currentWindow.minimize(); });
document.querySelector(".controls .close").addEventListener("click", () => { currentWindow.close(); });

// Closing the window
currentWindow.on("close", () => {
  if (config.hasRequestedClose) {
    event.preventDefault();
    return;
  }

  config.hasRequestedClose = true;
  config.save();

  if (myServer.serverProcess != null) {
    myServer.serverProcess.send("stop");
    event.preventDefault();
  }
});
