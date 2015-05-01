let nodeRequire = require;

window.addEventListener("message", (event) => {
  if (event.data.type !== "save") return;
  if (event.data.outputFolder == null) return;

  document.title = "Superpowers — Exporting...";
  let statusElt = document.querySelector(".status");
  statusElt.textContent = "Exporting...";

  let _ = nodeRequire("lodash");
  let async = nodeRequire("async");
  let fs = nodeRequire("fs");
  let path = nodeRequire("path");
  let mkdirp = nodeRequire("mkdirp");
  let toBuffer = nodeRequire("typedarray-to-buffer");
  let nwWindow = (<any>window).nwDispatcher.requireNwGui().Window.get();

  let buildPath = `/builds/${event.data.projectId}/${event.data.buildId}`;

  nwWindow.setProgressBar(0);
  let progress = 0;
  let progressMax = event.data.files.length;
  async.eachLimit(event.data.files, 10, (file: string, cb: (err: Error) => any) => {
    let outputFilename = file;
    if (_.startsWith(outputFilename, buildPath)) outputFilename = outputFilename.substr(buildPath.length);
    outputFilename = outputFilename.replace(/\//g, path.sep);

    let outputPath = `${event.data.outputFolder}${outputFilename}`;
    statusElt.textContent = outputPath;

    let xhr = new XMLHttpRequest();
    xhr.open("GET", file);
    xhr.responseType = "arraybuffer"

    xhr.onload = (event) => {
      if (xhr.status !== 200) { cb(new Error(`Failed to download ${file}, got status ${xhr.status}`)); return; }
      mkdirp(path.dirname(outputPath), (err: Error) => {
        if (err != null) { cb(err); return; }
        fs.writeFile(outputPath, toBuffer(new Uint8Array(xhr.response)).toString("binary"), { encoding: "binary" }, () => {
          progress++;
          nwWindow.setProgressBar(progress / progressMax);
          cb(null);
        });
      });
    }

    xhr.send();
  } , (err: Error) => {
    nwWindow.setProgressBar -1
    if (err != null) { alert(err); return; }
    // TODO: Add link to open in file browser
    document.title = "Superpowers — Exported"
    statusElt.textContent = `Exported to ${event.data.outputFolder}`
  });
});
