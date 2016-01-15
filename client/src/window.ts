if (SupClient.isApp) {
  const nodeRequire = require;
  const electron = nodeRequire("electron");
  const win = electron.remote.getCurrentWindow();

  function onMinimizeWindowClick() { win.minimize(); }

  function onMaximizeWindowClick() {
    const maximized = screen.availHeight <= win.getSize()[1];
    if (maximized) win.unmaximize();
    else win.maximize();
  }

  function onCloseWindowClick() { window.close(); }

  document.querySelector(".controls .minimize").addEventListener("click", onMinimizeWindowClick);
  document.querySelector(".controls .maximize").addEventListener("click", onMaximizeWindowClick);
  document.querySelector(".controls .close").addEventListener("click", onCloseWindowClick);

  const link = document.querySelector("a.server-footer");
  if (link != null) link.addEventListener("click", (event: any) => {
    event.preventDefault();
    electron.shell.openExternal(event.target.href);
  });
}
