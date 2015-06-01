let path = nodeRequire("path");
let fs = nodeRequire("fs");

let rootPath = path.resolve(path.dirname(nodeProcess.mainModule.filename));

// User data folder
export let userData = path.join(rootPath, "../..");

switch (nodeProcess.platform) {
  case "win32":
    if (nodeProcess.env.APPDATA != null) userData = path.join(nodeProcess.env.APPDATA, "Superpowers");
    break;
  case "darwin":
    if (nodeProcess.env.HOME != null) userData = path.join(nodeProcess.env.HOME, "Library", "Superpowers");
    break;
  default:
    if (nodeProcess.env.XDG_DATA_HOME != null) userData = path.join(nodeProcess.env.XDG_DATA_HOME, "Superpowers");
    else if (nodeProcess.env.HOME != null) userData = path.join(nodeProcess.env.HOME, ".local/share", "Superpowers");
}

// Config file
export let config = path.join(rootPath, "../../config.json");
if (!fs.existsSync(config)) {
  config = path.join(userData, "config.json");
}
