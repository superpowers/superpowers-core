export {};

let gui = (<any>window).nwDispatcher.requireNwGui();

document.querySelector(".panes .community").addEventListener("click", (event) => {
  if ((<Element>event.target).tagName !== "A") return;

  event.preventDefault();
  gui.Shell.openExternal((<HTMLAnchorElement>event.target).href);
});
