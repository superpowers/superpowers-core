export {};

let gui = (<any>window).nwDispatcher.requireNwGui();
let packageInfo = require("../../../package.json");

let splash = <HTMLDivElement>document.querySelector(".splash");

splash.addEventListener("click", (event) => {
  if ((<Element>event.target).tagName === "A") {
    event.preventDefault();
    gui.Shell.openExternal((<HTMLAnchorElement>event.target).href);
    return;
  }

  if (event.target !== splash) return;
  splash.parentElement.removeChild(splash);
});

// Check for new releases
document.querySelector(".splash .version").textContent = `v${packageInfo.version}`;
let updateStatus = <HTMLDivElement>document.querySelector(".splash .update-status");

let xhr = new XMLHttpRequest;
xhr.open("GET", "http://sparklinlabs.com/releases.json", true);
xhr.responseType = "json";

xhr.onload = (event) => {
  if (xhr.status != 200) {
    updateStatus.textContent = "Failed to check for updates.";
    return;
  }

  if (xhr.response[0].version == packageInfo.version) {
    updateStatus.textContent = "";
  } else {
    updateStatus.innerHTML = `UPDATE: v${xhr.response[0].version} is available. <a href="https://sparklinlabs.com/account" target="_blank">Download it now</a>.`;
  }
};

xhr.send();
