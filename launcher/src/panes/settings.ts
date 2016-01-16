import * as serverPaths from "./serverPaths";
import * as _ from "lodash";

import config from "../../../server/configDefaults";
import * as schemas from "../../../server/schemas";

const fs = nodeRequire("fs");
if (fs.existsSync(serverPaths.config)) {
  let userConfig: any;
  try {
    userConfig = JSON.parse(fs.readFileSync(serverPaths.config, { encoding: "utf8" }));
    schemas.validate(userConfig, "config");
  } catch (e) {
    userConfig = {};
  }

  if(userConfig.port != null) {
    userConfig.mainPort = userConfig.port;
    delete userConfig.port;
  }
  _.merge(config, userConfig);
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
