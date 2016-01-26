import * as serverPaths from "./serverPaths";
import { defaults as configDefaults, Config } from "../../../server/config";
import * as schemas from "../../../server/schemas";

const fs = nodeRequire("fs");

let config: Config = {} as any;
if (fs.existsSync(serverPaths.config)) {
  try {
    config = JSON.parse(fs.readFileSync(serverPaths.config, { encoding: "utf8" }));
    schemas.validate(config, "config");
  } catch (e) { /* Ignore */ }
}

for (const key in configDefaults) {
  if (config[key] == null) config[key] = configDefaults[key];
}

const mainPortInput = <HTMLInputElement>document.querySelector("input.main-server-port");
const buildPortInput = <HTMLInputElement>document.querySelector("input.build-server-port");
const passwordInput = <HTMLInputElement>document.querySelector("input.server-password");
const maxRecentBuildsInput = <HTMLInputElement>document.querySelector("input.max-recent-builds");

mainPortInput.value = config.mainPort.toString();
buildPortInput.value = config.buildPort.toString();
passwordInput.value = config.password;
maxRecentBuildsInput.value = config.maxRecentBuilds.toString();

document.querySelector("button.save-settings").addEventListener("click", (event) => {
  config.mainPort = parseInt(mainPortInput.value, 10);
  config.buildPort = parseInt(buildPortInput.value, 10);
  config.password = passwordInput.value;
  config.maxRecentBuilds = parseInt(maxRecentBuildsInput.value, 10);

  fs.writeFileSync(serverPaths.config, JSON.stringify(config, null, 2));
});
