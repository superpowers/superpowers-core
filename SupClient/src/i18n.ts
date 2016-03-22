import * as fs from "fs";
import * as cookies from "js-cookie";
import * as path from "path";
import * as _ from "lodash";

import * as SupClient from "./index";

export const languageIds = fs.readdirSync(`${__dirname}/../../public/locales`);

interface File {
  root: string;
  name: string;
  context?: string;
}
interface I18nValue { [key: string]: I18nValue|string; }
interface I18nContext { [context: string]: I18nValue; }

const languageCode = cookies.get("supLanguage");
const i18nFallbackContexts: I18nContext = {};
const i18nContexts: I18nContext = {};
let commonLocalesLoaded = false;

export function load(files: File[], callback: Function) {
  const firstLoad = !commonLocalesLoaded;

  function onLoadFinished() {
    if (firstLoad) {
      setupDefaultDialogLabels();
      setupHotkeyTitles();
    }
    callback();
  }

  if (languageCode === "none") { onLoadFinished(); return; }

  if (!commonLocalesLoaded) {
    files.unshift({ root: "/", name: "common" });
    commonLocalesLoaded = true;
  }

  let filesToLoad = files.length;
  if (filesToLoad === 0) { onLoadFinished(); return; }
  if (languageCode !== "en") filesToLoad *= 2;

  const loadFile = (languageCode: string, file: File, root: I18nContext) => {
    const filePath = path.join(file.root, `locales/${languageCode}`, `${file.name}.json`);
    SupClient.fetch(filePath, "json", (err, response) => {
      if (err != null) {
        filesToLoad -= 1;
        if (filesToLoad === 0) onLoadFinished();
      } else {
        const context = file.context != null ? file.context : file.name;
        if (root[context] == null) root[context] = response;
        else root[context] = _.merge(root[context], response) as any;

        filesToLoad -= 1;
        if (filesToLoad === 0) onLoadFinished();
      }
    });
  };

  for (const file of files) {
    loadFile(languageCode, file, i18nContexts);
    if (languageCode !== "en" && languageCode !== "none") loadFile("en", file, i18nFallbackContexts);
  }
}

export function t(key: string, variables: { [key: string]: string; } = {}) {
  if (languageCode === "none") return key;

  const [ context, keys ] = key.split(":");
  const keyParts = keys.split(".");

  let value: I18nValue|string = i18nContexts[context];
  if (value == null) return fallbackT(key, variables);

  for (const keyPart of keyParts) {
    value = (value as I18nValue)[keyPart];
    if (value == null) return fallbackT(key, variables);
  }

  if (typeof value === "string") return insertVariables(value, variables);
  else return key;
}

function fallbackT(key: string, variables: { [key: string]: string; } = {}) {
  const [ context, keys ] = key.split(":");
  const keyParts = keys.split(".");

  let valueOrText: I18nValue|string = i18nFallbackContexts[context];
  if (valueOrText == null) return key;

  for (const keyPart of keyParts) {
    valueOrText = (valueOrText as I18nValue)[keyPart];
    if (valueOrText == null) return key;
  }

  if (typeof valueOrText === "string") return insertVariables(valueOrText, variables);
  else return key;
}

function insertVariables(text: string, variables: { [key: string]: string }) {
  let index = 0;
  do {
    index = text.indexOf("${", index);
    if (index !== -1) {
      const endIndex = text.indexOf("}", index);
      const key = text.slice(index + 2, endIndex);
      const value = variables[key] != null ? variables[key] : `"${key}" is missing`;
      text = text.slice(0, index) + value + text.slice(endIndex + 1);
      index += 1;
    }
  } while (index !== -1);

  return text;
}


function setupDefaultDialogLabels() {
  for (const label in SupClient.Dialogs.BaseDialog.defaultLabels) {
    SupClient.Dialogs.BaseDialog.defaultLabels[label] = t(`common:actions.${label}`);
  }
}

function setupHotkeyTitles() {
  const hotkeyButtons = document.querySelectorAll("[data-hotkey]") as any as HTMLButtonElement[];
  for (const hotkeyButton of hotkeyButtons) {
    const hotkeys = hotkeyButton.dataset["hotkey"].split("+");

    let hotkeyComplete = "";
    for (const hotkey of hotkeys) {
      let hotkeyPartKey: string;
      if (hotkey === "control" && window.navigator.platform === "MacIntel") hotkeyPartKey = `common:hotkeys.command`;
      else hotkeyPartKey = `common:hotkeys.${hotkey}`;

      const hotkeyPartString = t(hotkeyPartKey);
      if (hotkeyComplete !== "") hotkeyComplete += "+";
      if (hotkeyPartString === hotkeyPartKey) hotkeyComplete += hotkey;
      else hotkeyComplete += hotkeyPartString;
    }

    hotkeyButton.title += ` (${hotkeyComplete})`;
  }
}
