import * as utils from "./utils";

export default function showRegistry() {
  utils.getRegistry((err, registry) => {
    console.log(`Core v${registry.core.version}`);
    console.log("");

    for (const systemId in registry.systems) {
      console.log(`System "${systemId}" v${registry.systems[systemId].version}`);
      utils.listAvailablePlugins(registry, systemId);
      console.log("");
    }
  });
}
