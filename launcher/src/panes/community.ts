export {};

let electron: GitHubElectron.Electron = nodeRequire("electron");

document.querySelector(".panes .community").addEventListener("click", (event) => {
  if ((<Element>event.target).tagName !== "A") return;

  event.preventDefault();
  electron.shell.openExternal((<HTMLAnchorElement>event.target).href);
});
