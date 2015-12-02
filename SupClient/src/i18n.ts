import * as cookies from "js-cookie";
import * as path from "path";
import * as _ from "lodash";

interface File {
  root: string;
  name: string;
  context?: string;
}
interface I18nValue { [key: string]: I18nValue|string; }
interface I18nContext { [context: string]: I18nValue; }

let language = cookies.get("language");
let i18nFallbackContexts: I18nContext = {};
let i18nContexts: I18nContext = {};
let supClientLocalesLoaded = false;

export function load(files: File[], callback: Function) {
  if (language === "none") { callback(); return; }

  if (!supClientLocalesLoaded) {
    files.unshift({ root: "/", name: "supClient" });
    supClientLocalesLoaded = true;
  }

  let filesToLoad = files.length;
  if (language !== "en") filesToLoad *= 2;

  let loadFile = (language: string, file: File, root: I18nContext) => {
    let filePath = path.join(file.root, `locales/${language}`, `${file.name}.json`);
    window.fetch(filePath).then((response) => {
      if (response.status === 404) {
        filesToLoad -= 1;
        if (filesToLoad === 0) callback();
      } else {
        response.json().then((data) => {
          let context = file.context != null ? file.context : file.name;
          if (root[context] == null) root[context] = data;
          else root[context] = _.merge(root[context], data) as any;

          filesToLoad -= 1;
          if (filesToLoad === 0) callback();
        });
      }
    });
  };

  for (let file of files) {
    loadFile(language, file, i18nContexts);
    if (language !== "en" && language !== "none") loadFile("en", file, i18nFallbackContexts);
  }
}

export function t(key: string, variables: { [key: string]: string } = {}) {
  if (language === "none") return key;

  let [ context, keys ] = key.split(":");
  let keyParts = keys.split(".");

  let locals: any = i18nContexts[context];
  if (locals == null) return fallbackT(key, variables);

  for (let keyPart of keyParts) {
    locals = locals[keyPart];
    if (locals == null) return fallbackT(key, variables);
  }

  return insertVariables(locals, variables);
}

function fallbackT(key: string, variables: { [key: string]: string } = {}) {
  let [ context, keys ] = key.split(":");
  let keyParts = keys.split(".");

  let locals: any = i18nFallbackContexts[context];
  if (locals == null) return key;

  for (let keyPart of keyParts) {
    locals = locals[keyPart];
    if (locals == null) return key;
  }

  return insertVariables(locals, variables);
}

function insertVariables(locals: string, variables: { [key: string]: string }) {
  let index = 0;
  do {
    index = locals.indexOf("${", index);
    if (index !== -1) {
      let endIndex = locals.indexOf("}", index);
      let key = locals.slice(index + 2, endIndex);
      let value = variables[key] != null ? variables[key] : `"${key}" is missing`;
      locals = locals.slice(0, index) + value + locals.slice(endIndex + 1);
      index += 1;
    }
  } while (index !== -1);

  return locals;
}
