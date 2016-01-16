export {};

const electron: GitHubElectron.Electron = nodeRequire("electron");

document.querySelector(".panes .community").addEventListener("click", (event) => {
  if ((event.target as Element).tagName !== "A") return;

  event.preventDefault();
  electron.shell.openExternal((event.target as HTMLAnchorElement).href);
});
