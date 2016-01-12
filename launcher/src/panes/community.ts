export {};

let electron: GitHubElectron.Electron = nodeRequire("electron");

document.querySelector(".panes .community").addEventListener("click", (event) => {
  if (((event as Element).target).tagName !== "A") return;

  event.preventDefault();
  electron.shell.openExternal(((event as HTMLAnchorElement).target).href);
});
