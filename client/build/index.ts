import * as async from "async";
import { BuildSetup } from "../project/sidebar/StartBuildDialog";

document.addEventListener("keydown", (event) => {
  // F12
  if (event.keyCode === 123) SupApp.getCurrentWindow().webContents.toggleDevTools();
});

let socket: SocketIOClient.Socket;

SupApp.onMessage("build", (buildSetup: BuildSetup, projectWindowId: number) => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("welcome", (clientId: number, config: { buildPort: number; supportsServerBuild: boolean; }) => {
    loadPlugins(buildSetup, () => {
      const buildPlugin = SupClient.getPlugins<SupClient.BuildPlugin>("build")[buildSetup.buildPluginName];
      buildPlugin.content.build(socket, buildSetup.settings, projectWindowId, config.buildPort);
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
        async.each(pluginsInfo.list, (pluginName, cb) => {
          const pluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
          SupClient.loadScript(`${pluginPath}/bundles/build.js`, cb);
        }, cb);
      }
    ], () => {
      document.querySelector("header").textContent = SupClient.i18n.t(`builds:${buildSetup.buildPluginName}.title`);
      callback();
    });
  });
}
