import * as _ from "lodash";
import * as fs from "fs";
import * as schemas from "./schemas";
import * as paths from "./paths";
import configDefaults from "./configDefaults";
import * as bcrypt from "bcryptjs";

export default configDefaults;

let bcryptRegex = /^\$2a\$10\$.{53}$/;

if (fs.existsSync(paths.config)) {
  const config = JSON.parse(fs.readFileSync(paths.config, { encoding: "utf8" }));
  schemas.validate(config, "config");

  if (config.port != null) {
    config.mainPort = config.port;
    delete config.port;
  }

  if (!bcryptRegex.test(config.password)) {
    let hashPassword = bcrypt.hashSync(config.password, 10);
    config.password = hashPassword;
    fs.writeFileSync(paths.config, JSON.stringify(config, null, 2) + "\n", { encoding: "utf8" });
  }

  _.merge(configDefaults, config);
} else {
  fs.writeFileSync(paths.config, JSON.stringify(configDefaults, null, 2) + "\n", { encoding: "utf8" });
}
