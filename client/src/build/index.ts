import * as async from "async";
import { BuildSetup } from "../project/sidebar/StartBuildDialog";

document.addEventListener("keydown", (event) => {
  // F12
  if (event.keyCode === 123) SupApp.getCurrentWindow().webContents.toggleDevTools();
});

let socket: SocketIOClient.Socket;

SupApp.getIpc().addListener("build", (sender: GitHubElectron.IpcRenderer, buildSetup: BuildSetup) => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("welcome", () => {
    loadPlugins(buildSetup, () => {
      const buildPlugin = SupClient.getPlugins<SupClient.BuildPlugin>("build")[buildSetup.buildPluginName];
      buildPlugin.content.build(socket, buildSetup.settings);
    });
  });
});

const detailsContainer = document.querySelector(".details") as HTMLDivElement;
const toggleDetailsButton = document.querySelector("button.toggle-details") as HTMLButtonElement;
toggleDetailsButton.addEventListener("click", () => {
  detailsContainer.hidden = !detailsContainer.hidden;
  toggleDetailsButton.textContent = SupClient.i18n.t("build:" + (detailsContainer.hidden ? "showDetails" : "hideDetails"));
  SupApp.getCurrentWindow().setContentSize(SupApp.getCurrentWindow().getContentSize()[0], detailsContainer.hidden ? 150 : 350);
});

function loadPlugins(buildSetup: BuildSetup, callback: Function) {
  const i18nFiles: SupClient.i18n.File[] = [];
  i18nFiles.push({ root: "/", name: "build" });
  i18nFiles.push({ root: buildSetup.pluginPath, name: "builds" });

  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    SupCore.system.pluginsInfo = pluginsInfo;

    async.parallel([
      (cb) => {
        SupClient.i18n.load(i18nFiles, cb);
      }, (cb) => {
        async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
          const pluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;

          const bundles = [ "data" ];
          if (pluginPath === buildSetup.pluginPath) bundles.push("build");

          async.each(bundles, (name, cb) => {
            const script = document.createElement("script");
            script.src = `${pluginPath}/bundles/${name}.js`;
            script.addEventListener("load", () => { cb(null); } );
            script.addEventListener("error", () => { cb(null); } );
            document.body.appendChild(script);
          }, pluginCallback);
        }, cb);
      }
    ], () => {
      document.querySelector("header").textContent = SupClient.i18n.t(`builds:${buildSetup.buildPluginName}.title`);
      callback();
    });
  });
}
