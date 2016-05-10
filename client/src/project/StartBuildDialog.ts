import * as async from "async";

import * as TreeView from "dnd-tree-view";
import { pluginsInfo } from "./index";

let buildPluginsLoaded = false;

export interface BuildSetup {
  pluginPath: string;
  buildPluginName: string;
  settings: any;
}

export default class StartBuildDialog extends SupClient.Dialogs.BaseDialog<BuildSetup> {
  private treeView: TreeView;
  private settingsContainer: HTMLDivElement;
  private loadingContainer: HTMLDivElement;
  private selectedPluginName: string;
  private settingsEditorsByName: { [pluginName: string]: SupClient.BuildSettingsEditor; } = {};

  constructor(callback: (result: BuildSetup) => void) {
    super(callback);

    this.formElt.style.width = "700px";

    SupClient.html("header", { parent: this.formElt, textContent: SupClient.i18n.t("project:build.title") });

    const styleElt = SupClient.html("style", { parent: this.formElt });
    styleElt.textContent = `
    .build-plugins-tree-view ol.tree { position: absolute; }
    .build-plugins-tree-view ol.tree li {
      display: block;
      height: auto;
      padding: .5em 1em;
      white-space: nowrap;
      overflow-x: hidden;
      text-overflow: ellipsis;
    }
    .build-plugins-tree-view .label { font-size: 1.5em; }
    `;

    const mainContainer = SupClient.html("div", "group", {
      parent: this.formElt,
      style: { display: "flex", height: "300px" }
    });

    // Build plugins
    const treeViewContainer = SupClient.html("div", [ "build-plugins-tree-view" ], {
      parent: mainContainer,
      style: {
        position: "relative",
        border: "1px solid #aaa",
        overflowY: "auto",
        width: "200px",
        marginRight: "0.5em"
      }
    });

    this.loadingContainer = SupClient.html("div", "tree-loading", { parent: treeViewContainer });
    SupClient.html("div", { parent: this.loadingContainer, textContent: SupClient.i18n.t("common:states.loading") });

    this.treeView = new TreeView(treeViewContainer, { multipleSelection: false });
    this.treeView.treeRoot.style.paddingBottom = "0";
    this.treeView.on("selectionChange", this.onTreeViewSelectionChange);

    // Build settings
    this.settingsContainer = SupClient.html("div", {
      parent: mainContainer,
      style: { flex: "1 1 0" }
    });

    // Buttons
    const buttonsElt = SupClient.html("div", "buttons", { parent: this.formElt });

    const cancelButtonElt = SupClient.html("button", "cancel-button", {
      parent: buttonsElt, type: "button",
      textContent: SupClient.i18n.t("common:actions.cancel")
    });
    cancelButtonElt.addEventListener("click", (event) => { event.preventDefault(); this.cancel(); });

    this.validateButtonElt = SupClient.html("button", "validate-button", {
      textContent: SupClient.i18n.t("project:build.build"),
      disabled: true
    });

    if (navigator.platform === "Win32") buttonsElt.insertBefore(this.validateButtonElt, cancelButtonElt);
    else buttonsElt.appendChild(this.validateButtonElt);

    this.treeView.treeRoot.focus();

    if (!buildPluginsLoaded) loadBuildPlugins(this.onBuildPluginsLoaded);
    else this.onBuildPluginsLoaded();
  }

  submit() {
    if (!buildPluginsLoaded) return;

    const plugin = SupClient.getPlugins<SupClient.BuildPlugin>("build")[this.selectedPluginName];

    super.submit({
      pluginPath: plugin.path,
      buildPluginName: this.selectedPluginName,
      settings: this.settingsEditorsByName[this.selectedPluginName].getSettings()
    });
  }

  private onBuildPluginsLoaded = () => {
    this.loadingContainer.parentElement.removeChild(this.loadingContainer);

    const plugins = SupClient.getPlugins<SupClient.BuildPlugin>("build");
    if (plugins != null && Object.keys(plugins).length > 0) {
      for (const pluginName in plugins) {
        const plugin = plugins[pluginName].content;
        const elt = SupClient.html("li", { dataset: { buildPlugin: pluginName } });
        this.treeView.append(elt, "item");

        SupClient.html("div", "label", { parent: elt, textContent: SupClient.i18n.t(`buildSettingsEditors:${pluginName}.label`) });
        SupClient.html("div", "description", { parent: elt, textContent: SupClient.i18n.t(`buildSettingsEditors:${pluginName}.description`) });

        this.settingsEditorsByName[pluginName] = new plugin.settingsEditor(this.settingsContainer);
      }

      this.treeView.addToSelection(this.treeView.treeRoot.querySelector("li") as HTMLLIElement);
      this.selectedPluginName = this.treeView.selectedNodes[0].dataset["buildPlugin"];
      this.validateButtonElt.disabled = false;
    }
  }

  private onTreeViewSelectionChange = () => {
    if (this.treeView.selectedNodes.length === 0) {
      this.treeView.addToSelection(this.treeView.treeRoot.querySelector(`li[data-build-plugin="${this.selectedPluginName}"]`) as HTMLLIElement);
    } else {
      this.selectedPluginName = this.treeView.selectedNodes[0].dataset["buildPlugin"];
    }
  };
}

function loadBuildPlugins(callback: Function) {
  const i18nFiles: SupClient.i18n.File[] = [];

  for (const pluginName of pluginsInfo.list) {
    const root = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
    i18nFiles.push({ root, name: "buildSettingsEditors" });
  }

  async.parallel([
    (cb) => {
      SupClient.i18n.load(i18nFiles, cb);
    }, (cb) => {
      async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
        const pluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
        async.each([ "build" ], (name, cb) => {
          const script = document.createElement("script");
          script.src = `${pluginPath}/bundles/${name}.js`;
          script.addEventListener("load", () => { cb(null); } );
          script.addEventListener("error", () => { cb(null); } );
          document.body.appendChild(script);
        }, pluginCallback);
      }, cb);
    }
  ], () => {
    buildPluginsLoaded = true;
    callback();
  });
}
