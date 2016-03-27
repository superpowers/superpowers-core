import * as utils from "./utils";

export default function showRegistry() {
  utils.getRegistry((err, registry) => {
    for (const systemId in registry.systems) {
      utils.listAvailablePlugins(registry, systemId);
      console.log("");
    }
  });
}


