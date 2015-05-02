import * as serverPaths from "./serverPaths";
import * as _ from "lodash";

import config from "../../../server/configDefaults";
import * as schemas from "../../../server/schemas";

let fs = nodeRequire("fs");
if (fs.existsSync(serverPaths.config)) {
  let userConfig = JSON.parse(fs.readFileSync(serverPaths.config, { encoding: "utf8" }));
  try { schemas.validate(userConfig, "config"); }
  catch(e) { userConfig = {}; }
  _.merge(config, userConfig);
}

let portInput = <HTMLInputElement>document.querySelector("input.server-port");
let passwordInput = <HTMLInputElement>document.querySelector("input.server-password");
let maxRecentBuildsInput = <HTMLInputElement>document.querySelector("input.max-recent-builds");

portInput.value = config.port.toString();
passwordInput.value = config.password;
maxRecentBuildsInput.value = config.maxRecentBuilds.toString();

document.querySelector("button.save-settings").addEventListener("click", (event) => {
  config.port = parseInt(portInput.value);
  config.password = passwordInput.value;
  config.maxRecentBuilds = parseInt(maxRecentBuildsInput.value);

  fs.writeFileSync(serverPaths.config, JSON.stringify(config, null, 2));
});
