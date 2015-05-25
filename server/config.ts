import * as _ from "lodash";
import * as path from "path";
import * as fs from "fs";
import * as schemas from "./schemas";
import * as paths from "./paths";
import configDefaults from "./configDefaults";

export default configDefaults;

if (fs.existsSync(paths.config)) {
  let config = JSON.parse(fs.readFileSync(paths.config, { encoding: "utf8" }));
  schemas.validate(config, "config");

  if (config.port != null) {
    config.mainPort = config.port;
    delete config.port;
  }

  _.merge(configDefaults, config);
} else {
  fs.writeFileSync(paths.config, JSON.stringify(configDefaults, null, 2) + "\n", { encoding: "utf8" });
}
