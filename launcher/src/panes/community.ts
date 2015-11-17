export {};

let shell: GitHubElectron.Shell = nodeRequire("shell");

document.querySelector(".panes .community").addEventListener("click", (event) => {
  if ((<Element>event.target).tagName !== "A") return;

  event.preventDefault();
  shell.openExternal((<HTMLAnchorElement>event.target).href);
});
