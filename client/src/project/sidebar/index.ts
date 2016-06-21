import * as ResizeHandle from "resize-handle";

import * as entriesTreeView from "./entriesTreeView";
import * as header from "./header";

export const openInNewWindowButton = SupClient.html("button", "open-in-new-window", { title: SupClient.i18n.t("project:treeView.openInNewWindow") });

export function start() {
  const sidebarResizeHandle = new ResizeHandle(document.querySelector(".sidebar") as HTMLElement, "left");
  if (SupClient.query.asset != null || SupClient.query["tool"] != null) {
    sidebarResizeHandle.handleElt.classList.add("collapsed");
    sidebarResizeHandle.targetElt.style.width = "0";
    sidebarResizeHandle.targetElt.style.display = "none";
  }

  header.start();
  entriesTreeView.start();
}

export function enable() {
  header.enable();
  entriesTreeView.enable();
}

export function disable() {
  header.disable();
  entriesTreeView.disable();
}
