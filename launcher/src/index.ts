import "./panes";
import "./splash";
import * as myServer from "./myServer";
import * as config from "./config";

let gui = (<any>window).nwDispatcher.requireNwGui();
let nwWindow = gui.Window.get();
// nwWindow.showDevTools();

document.querySelector(".controls .minimize").addEventListener("click", () => { nwWindow.minimize(); });
document.querySelector(".controls .close").addEventListener("click", () => { nwWindow.close(false); });

// Closing the window
nwWindow.on("close", () => {
  if (config.hasRequestedClose) return;
  config.hasRequestedClose = true;
  config.save();

  if (myServer.serverProcess != null) myServer.serverProcess.send("stop");
  else nwWindow.close(true);
});
