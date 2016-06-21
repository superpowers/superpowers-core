import * as async from "async";

import * as sidebar from "../sidebar";
import * as tabs from "./";
import * as homeTab from "./homeTab";

export let toolsByName: { [name: string]: tabs.EditorManifest };
const toolsElt = document.querySelector(".sidebar .tools ul") as HTMLUListElement;

export function setup(toolPaths: { [name: string]: string; }, callback: Function) {
  toolsByName = {};

  const pluginsRoot = `/systems/${SupCore.system.id}/plugins`;

  async.each(Object.keys(toolPaths), (toolName, cb) => {
    const pluginPath = toolPaths[toolName];

    const toolTitle = SupClient.i18n.t(`${toolPaths[toolName]}:editors.${toolName}.title`);

    SupClient.fetch(`${pluginsRoot}/${pluginPath}/editors/${toolName}/manifest.json`, "json", (err: Error, toolManifest: tabs.EditorManifest) => {
      if (err != null) {
        toolsByName[toolName] = { pinned: false, pluginPath, title: toolTitle };
        cb();
        return;
      }

      toolsByName[toolName] = toolManifest;
      toolsByName[toolName].pluginPath = pluginPath;
      toolsByName[toolName].title = toolTitle;
      cb();
    });
  }, () => {
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
  let iframe = tabs.panesElt.querySelector(`iframe[data-name='${name}']`) as HTMLIFrameElement;

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

    iframe = SupClient.html("iframe", { parent: tabs.panesElt, dataset: { name }});
    iframe.src = `/systems/${SupCore.system.id}/plugins/${tool.pluginPath}/editors/${name}/?project=${SupClient.query.project}`;
    if (state != null) iframe.addEventListener("load", () => { iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin); });

  } else if (state != null) {
    iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin);
  }

  tabs.onActivate(tab);

  if (name === "main") homeTab.setup(tab);
}

function createTabElement(toolName: string, tool: tabs.EditorManifest) {
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
