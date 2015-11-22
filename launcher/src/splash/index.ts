let shell: GitHubElectron.Shell = nodeRequire("shell");

/* tslint:disable */
// Must use require rather than fs so that it gets browserified
let packageInfo = require("../../../package.json");
/* tslint:enable */

let splash = <HTMLDivElement>document.querySelector(".splash");

splash.addEventListener("click", (event) => {
  if ((<Element>event.target).tagName === "A") {
    event.preventDefault();
    shell.openExternal((<HTMLAnchorElement>event.target).href);
    return;
  }

  if (event.target !== splash) return;
  splash.parentElement.removeChild(splash);
});

// Check for new releases
document.querySelector(".splash .version").textContent = `v${packageInfo.version}`;
let updateStatus = <HTMLDivElement>document.querySelector(".splash .update-status");

window.fetch("http://sparklinlabs.com/releases.json").then((response) => response.json(), (response) => { updateStatus.textContent = "Failed to check for updates."; })
  .then((releases) => {
    let lastVersion = releases[0].version;
    if (lastVersion === packageInfo.version) updateStatus.textContent = "";
    else
      updateStatus.innerHTML = `UPDATE: v${lastVersion} is available. <a href="https://sparklinlabs.com/account" target="_blank">Download it now</a>.`;
});
