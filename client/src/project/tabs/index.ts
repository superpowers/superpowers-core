import * as TabStrip from "tab-strip";

export interface EditorManifest {
  title: string;
  // assetType: string; <- for asset editors, soon
  pinned?: boolean;
  pluginPath: string;
}

const tabsBarElt = document.querySelector(".tabs-bar") as HTMLElement;
export const tabStrip = new TabStrip(tabsBarElt);

export const panesElt = document.querySelector(".main .panes") as HTMLDivElement;

export function start() {
  tabStrip.on("activateTab", onActivate);
  tabStrip.on("closeTab", onClose);

  // Prevent <iframe> panes from getting mouse event while dragging tabs
  function restorePanesMouseEvent(event: any) {
    panesElt.style.pointerEvents = "";
    document.removeEventListener("mouseup", restorePanesMouseEvent);
  }

  tabsBarElt.addEventListener("mousedown", (event) => {
    panesElt.style.pointerEvents = "none";
    document.addEventListener("mouseup", restorePanesMouseEvent);
  });
}

export function onActivate(tabElement: HTMLLIElement) {
  const activeTab = tabStrip.tabsRoot.querySelector(".active");
  if (activeTab != null) {
    activeTab.classList.remove("active");

    const activeIframe = (panesElt.querySelector("iframe.active") as HTMLIFrameElement);
    activeIframe.contentWindow.postMessage({ type: "deactivate" }, window.location.origin);
    activeIframe.classList.remove("active");
  }

  tabElement.classList.add("active");
  tabElement.classList.remove("unread");

  const assetId = tabElement.dataset["assetId"];
  let tabIframe: HTMLIFrameElement;
  if (assetId != null) tabIframe = panesElt.querySelector(`iframe[data-asset-id='${assetId}']`) as HTMLIFrameElement;
  else tabIframe = panesElt.querySelector(`iframe[data-name='${tabElement.dataset["pane"]}']`) as HTMLIFrameElement;

  tabIframe.classList.add("active");
  tabIframe.contentWindow.focus();
  tabIframe.contentWindow.postMessage({ type: "activate" }, window.location.origin);
}

export function onClose(tabElement?: HTMLLIElement) {
  if (tabElement == null) tabElement = tabStrip.tabsRoot.querySelector(".active") as HTMLLIElement;

  const assetId = tabElement.dataset["assetId"];
  let frameElt: HTMLIFrameElement;
  if (assetId != null) frameElt = panesElt.querySelector(`iframe[data-asset-id='${assetId}']`) as HTMLIFrameElement;
  else {
    if (tabElement.classList.contains("pinned")) return;
    const toolName = tabElement.dataset["pane"];
    frameElt = panesElt.querySelector(`iframe[data-name='${toolName}']`) as HTMLIFrameElement;
  }

  if (tabElement.classList.contains("active")) {
    const activeTabElement = (tabElement.nextElementSibling != null) ? tabElement.nextElementSibling as HTMLLIElement : tabElement.previousElementSibling as HTMLLIElement;
    if (activeTabElement != null) onActivate(activeTabElement);
  }

  tabElement.parentElement.removeChild(tabElement);
  frameElt.parentElement.removeChild(frameElt);
}

export function onActivatePrevious() {
  const activeTabElt = tabStrip.tabsRoot.querySelector(".active");
  for (let tabIndex = 0; tabStrip.tabsRoot.children.length; tabIndex++) {
    const tabElt = tabStrip.tabsRoot.children[tabIndex];
    if (tabElt === activeTabElt) {
      const newTabIndex = (tabIndex === 0) ? tabStrip.tabsRoot.children.length - 1 : tabIndex - 1;
      onActivate(tabStrip.tabsRoot.children[newTabIndex] as HTMLLIElement);
      return;
    }
  }
}

export function onActivateNext() {
  const activeTabElt = tabStrip.tabsRoot.querySelector(".active");
  for (let tabIndex = 0; tabStrip.tabsRoot.children.length; tabIndex++) {
    const tabElt = tabStrip.tabsRoot.children[tabIndex];
    if (tabElt === activeTabElt) {
      const newTabIndex = (tabIndex === tabStrip.tabsRoot.children.length - 1) ? 0 : tabIndex + 1;
      onActivate(tabStrip.tabsRoot.children[newTabIndex] as HTMLLIElement);
      return;
    }
  }
}
