import hub from "./hub";
import project from "./project";

let qs = require("querystring").parse(window.location.search.slice(1));

if (qs.project != null) project(qs.project);
else hub();

let nwDispatcher = (<any>window).nwDispatcher;
if (nwDispatcher != null) {
  let gui = nwDispatcher.requireNwGui();
  let win = gui.Window.get();

  win.on("maximize", () => { document.body.classList.add("maximized"); });
  win.on("unmaximize", () => { document.body.classList.remove("maximized"); });

  function onMinimizeWindowClick() { win.minimize(); }

  function onMaximizeWindowClick() {
    let maximized = screen.availHeight <= win.height;
    // NOTE: .toggle signature lacks the second argument in TypeScript 1.5 alpha
    (<any>document.body.classList.toggle)("maximized", !maximized);
    if (maximized) win.unmaximize();
    else win.maximize();
  }

  function onCloseWindowClick() { window.close(); }

  document.querySelector(".controls .minimize").addEventListener("click", onMinimizeWindowClick);
  document.querySelector(".controls .maximize").addEventListener("click", onMaximizeWindowClick);
  document.querySelector(".controls .close").addEventListener("click", onCloseWindowClick);

  let link = document.querySelector("a.superpowers");
  if (link != null) link.addEventListener("click", (event: any) => {
    event.preventDefault();
    gui.Shell.openExternal(event.target.href);
  });

} else document.body.classList.add("browser");
