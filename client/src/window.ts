if (SupClient.isApp) {
  let nodeRequire = require;
  let electron = nodeRequire("electron");
  let win = electron.remote.getCurrentWindow();

  function onMinimizeWindowClick() { win.minimize(); }

  function onMaximizeWindowClick() {
    let maximized = screen.availHeight <= win.getSize()[1];
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
    electron.shell.openExternal(event.target.href);
  });
}
