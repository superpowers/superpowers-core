import * as utils from "./utils";

export default function showRegistry() {
  utils.getRegistry((err, registry) => {
    if (err != null) {
      if (process != null && process.send != null) process.send({ type: "registry", error: err.message });
      console.log("Could not get registry:");
      throw err;
    }

    if (process != null && process.send != null) process.send({ type: "registry", registry });

    console.log(`Core - Latest: v${registry.core.version} / Installed: v${registry.core.localVersion}`);
    console.log("");

    for (const systemId in registry.systems) {
      const system = registry.systems[systemId];
      const local = system.localVersion != null ? `Installed: v${system.localVersion}` : "Not Installed";
      console.log(`System "${systemId}" - Latest: v${system.version} / ${local}`);
      utils.listAvailablePlugins(registry, systemId);
      console.log("");
    }
  });
}
