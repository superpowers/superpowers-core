import { entries, socket } from "../network";
import * as entriesTreeView from "../sidebar/entriesTreeView";
import * as tabs from "./";

export let assetTypes: string[];
export let editorsByAssetType: { [assetType: string]: tabs.EditorManifest };

export function setup(editorPaths: { [assetType: string]: string; }, callback: Function) {
  editorsByAssetType = {};
  for (const assetType in editorPaths) {
    editorsByAssetType[assetType] = {
      title: SupClient.i18n.t(`${editorPaths[assetType]}:editors.${assetType}.title`),
      pluginPath: editorPaths[assetType]
    };
  }

  assetTypes = Object.keys(editorPaths).sort((a, b) => editorsByAssetType[a].title.localeCompare(editorsByAssetType[b].title));
  callback();
}

export function open(id: string, state?: {[name: string]: any}) {
  const entry = entries.byId[id];
  if (entry == null) return;

  // Just toggle folders
  if (entry.type == null) { entriesTreeView.widget.selectedNodes[0].classList.toggle("collapsed"); return; }

  entriesTreeView.scrollEntryIntoView(id);

  let tab = tabs.tabStrip.tabsRoot.querySelector(`li[data-asset-id='${id}']`) as HTMLLIElement;
  if (tab == null) {
    tab = createTabElement(entry);
    tabs.tabStrip.tabsRoot.appendChild(tab);

    const paneElt = SupClient.html("div", "pane-container", { parent: tabs.panesElt, dataset: { assetId: id } });

    const revisionOuterContainer = SupClient.html("div", "revision-outer-container", { parent: paneElt });
    const revisionInnerContainer = SupClient.html("div", "revision-inner-container", { parent: revisionOuterContainer });
    SupClient.html("span", { parent: revisionInnerContainer, textContent: SupClient.i18n.t("project:revision.title") });

    const selectElt = SupClient.html("select", { parent: revisionInnerContainer, disabled: true });
    SupClient.html("option", { parent: selectElt, textContent: SupClient.i18n.t("project:revision.current"), value: "current" });

    for (let revisionIndex = entry.revisions.length - 1; revisionIndex >= 0; revisionIndex--) {
      const revision = entry.revisions[revisionIndex];
      SupClient.html("option", { parent: selectElt, textContent: revision.name, value: revision.id });
    }

    const saveOrRestoreButtonElt = SupClient.html("button", { parent: revisionInnerContainer, textContent: SupClient.i18n.t("common:actions.save"), disabled: true });

    const src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/?project=${SupClient.query.project}&asset=${id}`;
    const iframe = SupClient.html("iframe", { parent: paneElt, src });
    if (state != null) iframe.addEventListener("load", () => { iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin); });

    selectElt.addEventListener("change", () => {
      saveOrRestoreButtonElt.textContent = SupClient.i18n.t(`common:actions.${selectElt.value === "current" ? "save" : "restore"}`);
      iframe.contentWindow.postMessage({ type: "setRevision", revisionId: selectElt.value }, window.location.origin);
    });

    saveOrRestoreButtonElt.addEventListener("click", () => {
      if (selectElt.value === "current") {
        const date = new Date();
        const options = {
          header: SupClient.i18n.t("project:revision.title"),
          validationLabel: SupClient.i18n.t("common:actions.save"),
          initialValue: `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDay()} ${date.getUTCHours()}h${date.getUTCMinutes()}`,
          title: SupClient.i18n.t("common:namePatternDescription"),
          pattern: SupClient.namePattern
        };

        /* tslint:disable:no-unused-expression */
        new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("project:revision.prompt"), options, (revisionName) => {
          /* tslint:enable:no-unused-expression */
          if (revisionName == null) return;

          socket.emit("save:entries", id, revisionName, (err: string) => {
            if (err != null) {
              /* tslint:disable:no-unused-expression */
              new SupClient.Dialogs.InfoDialog(err);
              /* tslint:enable:no-unused-expression */
              return;
            }
          });
        });

      } else {
        selectElt.disabled = true;
        saveOrRestoreButtonElt.disabled = true;
        saveOrRestoreButtonElt.textContent = SupClient.i18n.t("project:revision.restoring");

        socket.emit("restore:assets", id, selectElt.value, (err: string) => {
          if (err != null) {
            /* tslint:disable:no-unused-expression */
            new SupClient.Dialogs.InfoDialog(err);
            /* tslint:enable:no-unused-expression */
            return;
          }

          selectElt.disabled = false;
          selectElt.value = "current";
          saveOrRestoreButtonElt.disabled = false;
          saveOrRestoreButtonElt.textContent = SupClient.i18n.t("common:actions.save");
          iframe.contentWindow.postMessage({ type: "setRevision", revisionId: "restored" }, window.location.origin);
        });
      }
    });

  } else if (state != null) {
    const iframe = tabs.panesElt.querySelector(`[data-asset-id='${id}'] iframe`) as HTMLIFrameElement;
    iframe.contentWindow.postMessage({ type: "setState", state }, window.location.origin);
  }

  tabs.onActivate(tab);
  return tab;
}

function createTabElement(entry: SupCore.Data.EntryNode) {
  const tabElt = SupClient.html("li", { dataset: { assetId: entry.id }});

  if (entry.type != null) {
    const iconElt = SupClient.html("img", "icon", { parent: tabElt });
    iconElt.src = `/systems/${SupCore.system.id}/plugins/${editorsByAssetType[entry.type].pluginPath}/editors/${entry.type}/icon.svg`;

    // FIXME: This event isn't emitted on the last opened tab in Chrome. Works fine in Firefox though
    tabElt.addEventListener("dblclick", () => { entriesTreeView.scrollEntryIntoView(entry.id); });
  }

  const tabLabel = SupClient.html("div", "label", { parent: tabElt });
  SupClient.html("div", "location", { parent: tabLabel });
  SupClient.html("div", "name", { parent: tabLabel });

  const closeButton = SupClient.html("button", "close", { parent: tabElt });
  closeButton.addEventListener("click", () => { tabs.onClose(tabElt); });

  refreshTabElement(entry, tabElt);

  return tabElt;
}

export function refreshTabElement(entry: SupCore.Data.EntryNode, tabElt?: HTMLLIElement) {
  if (tabElt == null) tabElt = tabs.tabStrip.tabsRoot.querySelector(`li[data-asset-id='${entry.id}']`) as HTMLLIElement;
  if (tabElt == null) return;

  const entryPath = entries.getPathFromId(entry.id);
  const entryName = entry.name;

  const lastSlash = entryPath.lastIndexOf("/");
  let entryLocation = (lastSlash !== -1) ? entryPath.slice(0, lastSlash) : "";

  const maxEntryLocationLength = 20;
  while (entryLocation.length > maxEntryLocationLength) {
    const slashIndex = entryLocation.indexOf("/", 2);
    if (slashIndex === -1) break;
    entryLocation = `…/${entryLocation.slice(slashIndex + 1)}`;
  }

  tabElt.querySelector(".label .location").textContent = entryLocation;
  tabElt.querySelector(".label .name").textContent = entryName;
  tabElt.title = entryPath;
}

export function setRevisionDisabled(id: string, disabled: boolean) {
  const revisionContainer = tabs.panesElt.querySelector(`[data-asset-id='${id}'] .revision-inner-container`);
  (revisionContainer.querySelector("select") as HTMLSelectElement).disabled = disabled;
  (revisionContainer.querySelector("button") as HTMLButtonElement).disabled = disabled;
}
