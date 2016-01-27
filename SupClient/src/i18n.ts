import * as fs from "fs";
import * as cookies from "js-cookie";
import * as path from "path";
import * as _ from "lodash";

export const languageIds = fs.readdirSync(`${__dirname}/../../public/locales`);

interface File {
  root: string;
  name: string;
  context?: string;
}
interface I18nValue { [key: string]: I18nValue|string; }
interface I18nContext { [context: string]: I18nValue; }

const language = cookies.get("supLanguage");
const i18nFallbackContexts: I18nContext = {};
const i18nContexts: I18nContext = {};
let commonLocalesLoaded = false;

export function load(files: File[], callback: Function) {
  function onLoadFinished() {
    for (let label in SupClient.dialogs.BaseDialog.defaultLabels)
      SupClient.dialogs.BaseDialog.defaultLabels[label] = t(`common:actions.${label}`);
    callback();
  }

  if (language === "none") { onLoadFinished(); return; }

  if (!commonLocalesLoaded) {
    files.unshift({ root: "/", name: "common" });
    commonLocalesLoaded = true;
  }

  let filesToLoad = files.length;
  if (filesToLoad === 0) { onLoadFinished(); return; }
  if (language !== "en") filesToLoad *= 2;

  const loadFile = (language: string, file: File, root: I18nContext) => {
    const filePath = path.join(file.root, `locales/${language}`, `${file.name}.json`);
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
    loadFile(language, file, i18nContexts);
    if (language !== "en" && language !== "none") loadFile("en", file, i18nFallbackContexts);
  }
}

export function t(key: string, variables: { [key: string]: string; } = {}) {
  if (language === "none") return key;

  const [ context, keys ] = key.split(":");
  const keyParts = keys.split(".");

  let locals: I18nValue|string = i18nContexts[context];
  if (locals == null) return fallbackT(key, variables);

  for (const keyPart of keyParts) {
    locals = (locals as I18nValue)[keyPart];
    if (locals == null) return fallbackT(key, variables);
  }

  if (typeof locals === "string") return insertVariables(locals, variables);
  else return key;
}

function fallbackT(key: string, variables: { [key: string]: string; } = {}) {
  const [ context, keys ] = key.split(":");
  const keyParts = keys.split(".");

  let locals: I18nValue|string = i18nFallbackContexts[context];
  if (locals == null) return key;

  for (const keyPart of keyParts) {
    locals = (locals as I18nValue)[keyPart];
    if (locals == null) return key;
  }

  if (typeof locals === "string") return insertVariables(locals, variables);
  else return key;
}

function insertVariables(locals: string, variables: { [key: string]: string }) {
  let index = 0;
  do {
    index = locals.indexOf("${", index);
    if (index !== -1) {
      const endIndex = locals.indexOf("}", index);
      const key = locals.slice(index + 2, endIndex);
      const value = variables[key] != null ? variables[key] : `"${key}" is missing`;
      locals = locals.slice(0, index) + value + locals.slice(endIndex + 1);
      index += 1;
    }
  } while (index !== -1);

  return locals;
}
