import * as fs from "fs";

import * as utils from "./utils";

export default function list() {
  const packageData = fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" });
  const { version } = JSON.parse(packageData);
  console.log(`Core v${version}`);
  console.log("");

  for (const systemId in utils.systemsById) {
    const system = utils.systemsById[systemId];
    console.log(`System "${systemId}" v${system.version}, installed in folder "${system.folderName}".`);

    const pluginAuthors = Object.keys(system.plugins);
    if (pluginAuthors.length === 0) {
      console.log("No external plugins installed.");
    } else {
      for (const pluginAuthor of pluginAuthors) {
        console.log(`  ${pluginAuthor}/`);
        for (const pluginName of system.plugins[pluginAuthor]) console.log(`    ${pluginName}`);
      }
    }
    console.log("");
  }
}
