import * as utils from "./utils";

export default function list() {
  for (const systemId in utils.systemsById) {
    const system = utils.systemsById[systemId];
    console.log(`System "${systemId}" installed in folder "${system.folderName}".`);

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
