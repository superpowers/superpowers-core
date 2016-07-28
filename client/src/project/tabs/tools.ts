import * as async from "async";

import * as sidebar from "../sidebar";
import * as tabs from "./";
import * as homeTab from "./homeTab";

type ToolManifest = {
  title: string;
  pluginPath: string;
  pinned: boolean
};

export let toolsByName: { [name: string]: ToolManifest };
const toolsElt = document.querySelector(".sidebar .tools ul") as HTMLUListElement;

export function setup(toolPaths: { [name: string]: string; }, callback: Function) {
  toolsByName = {};

  const pluginsRoot = `/systems/${SupCore.system.id}/plugins`;

  async.each(Object.keys(toolPaths), (toolName, cb) => {
    const toolTitle = SupClient.i18n.t(`${toolPaths[toolName]}:editors.${toolName}.title`);
    const pluginPath = toolPaths[toolName];

    toolsByName[toolName] = { title: toolTitle, pluginPath, pinned: false };
    SupClient.fetch(`${pluginsRoot}/${pluginPath}/editors/${toolName}/manifest.json`, "json", (err: Error, toolManifest: ToolManifest) => {
      if (err != null) { cb(err); return; }

      toolsByName[toolName].pinned = toolManifest.pinned;
      cb();
    });
  }, (err) => {
    if (err != null) { callback(err); return; }

    toolsElt.innerHTML = "";

    const toolNames = Object.keys(toolsByName);
    toolNames.sort((a, b) => toolsByName[a].title.localeCompare(toolsByName[b].title));

    for (const toolName of toolNames) setupTool(toolName);
    callback();
  });
}

function setupTool(toolName: string) {
  const tool = toolsByName[toolName];

  if (tool.pinned && SupClient.query.asset == null && SupClient.query["tool"] == null) {
    open(toolName);
    return;
  }

  const toolElt = SupClient.html("li", { parent: toolsElt, dataset: { name: toolName } });
  toolElt.addEventListener("mouseenter", (event: any) => { event.target.appendChild(sidebar.openInNewWindowButton); });
  toolElt.addEventListener("mouseleave", (event) => {
    if (sidebar.openInNewWindowButton.parentElement != null) sidebar.openInNewWindowButton.parentElement.removeChild(sidebar.openInNewWindowButton);
  });

  const containerElt = SupClient.html("div", { parent: toolElt });
  SupClient.html("img", { parent: containerElt, src: `/systems/${SupCore.system.id}/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg` });

  const nameSpanElt = SupClient.html("span", "name", { parent: containerElt, textContent: SupClient.i18n.t(`${tool.pluginPath}:editors.${toolName}.title`) });
  nameSpanElt.addEventListener("click", (event: any) => { open(event.target.parentElement.parentElement.dataset["name"]); });
}

export function open(name: string, state?: { [name: string]: any }) {
  let tab = tabs.tabStrip.tabsRoot.querySelector(`li[data-pane='${name}']`) as HTMLLIElement;

  if (tab == null) {
    const tool = toolsByName[name];
    tab = createTabElement(name, tool);

    if (toolsByName[name].pinned) {
      const toolElt = toolsElt.querySelector(`li[data-name="${name}"]`) as HTMLLIElement;
      if (toolElt != null) toolElt.parentElement.removeChild(toolElt);

      const firstUnpinnedTab = tabs.tabStrip.tabsRoot.querySelector("li:not(.pinned)") as HTMLLIElement;
      tabs.tabStrip.tabsRoot.insertBefore(tab, firstUnpinnedTab);
    } else {
      tabs.tabStrip.tabsRoot.appendChild(tab);
    }

    const paneElt = SupClient.html("div", "pane-container", { parent: tabs.panesElt, dataset: { name } });

    const src = `/systems/${SupCore.system.id}/plugins/${tool.pluginPath}/editors/${name}/?project=${SupClient.query.project}`;
    const iframe = SupClient.html("iframe", { parent: paneElt, src });
    if (state != null) iframe.addEventListener("load", () => { iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin); });

  } else if (state != null) {
    const iframe = tabs.panesElt.querySelector(`iframe[data-name='${name}']`) as HTMLIFrameElement;
    iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin);
  }

  tabs.onActivate(tab);

  if (name === "main") homeTab.setup(tab);
}

function createTabElement(toolName: string, tool: ToolManifest) {
  const tabElt = SupClient.html("li", { dataset: { pane: toolName }});
  tabElt.classList.toggle("pinned", tool.pinned);

  const iconElt = SupClient.html("img", "icon", { parent: tabElt });
  iconElt.src = `/systems/${SupCore.system.id}/plugins/${tool.pluginPath}/editors/${toolName}/icon.svg`;

  if (!tool.pinned) {
    const tabLabel = SupClient.html("div", "label", { parent: tabElt });
    SupClient.html("div", "name", { parent: tabLabel, textContent: SupClient.i18n.t(`${tool.pluginPath}:editors.${toolName}.title`) });

    const closeButton = SupClient.html("button", "close", { parent: tabElt });
    closeButton.addEventListener("click", () => { tabs.onClose(tabElt); });
  }

  return tabElt;
}
