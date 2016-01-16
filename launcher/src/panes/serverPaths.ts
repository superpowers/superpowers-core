const path = nodeRequire("path");
const fs = nodeRequire("fs");

const rootPath = path.resolve(path.dirname(nodeProcess.mainModule.filename));

// Config file
let userDataPath = path.join(rootPath, "../..");
let configPath = path.join(rootPath, "../../config.json");

if (!fs.existsSync(configPath)) {
  // No local config file found, so let's look in the user data folder
  userDataPath = path.join(rootPath, "../..");

  switch (nodeProcess.platform) {
    case "win32":
      if (nodeProcess.env.APPDATA != null) userDataPath = path.join(nodeProcess.env.APPDATA, "Superpowers");
      break;
    case "darwin":
      if (nodeProcess.env.HOME != null) userDataPath = path.join(nodeProcess.env.HOME, "Library", "Superpowers");
      break;
    default:
      if (nodeProcess.env.XDG_DATA_HOME != null) userDataPath = path.join(nodeProcess.env.XDG_DATA_HOME, "Superpowers");
      else if (nodeProcess.env.HOME != null) userDataPath = path.join(nodeProcess.env.HOME, ".local/share", "Superpowers");
  }

  configPath = path.join(userDataPath, "config.json");
}

export const userData = userDataPath;
export const config = configPath;
