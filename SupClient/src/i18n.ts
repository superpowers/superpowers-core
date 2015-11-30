import * as cookies from "js-cookie";
import * as path from "path";

// Initialize preferred language
let language: string = cookies.get("language");
if (language == null) {
  language = window.navigator.language;
  let separatorIndex = language.indexOf("-");
  if (separatorIndex !== -1) language = language.slice(0, separatorIndex);

  cookies.set("language", language);
}

interface Locals {
  [key: string]: Locals|string;
}
interface LocalsByContext {
  [context: string]: Locals;
}

let defaultLocalsByContext: LocalsByContext = {};
let localsByContext: LocalsByContext = {};

export function load(fileName: string, callback: Function) {
  let filesToLoad = 0;
  let allFilesRequested = false;
  
  let loadFile = (language: string, fileName: string, root: LocalsByContext) => {
    filesToLoad += 1;
    let filePath = path.join(window.location.pathname, `../../locales/${language}/${fileName}.json`);
    window.fetch(filePath).then((response) => response.json()).then((data) => {
      root[fileName] = data;

      filesToLoad -= 1;
      if (filesToLoad === 0 && allFilesRequested) callback();
    });
  }

  loadFile(language, fileName, localsByContext);
  if (language !== "en") loadFile("en", fileName, defaultLocalsByContext);
  allFilesRequested = true;
}

export function t(key: string) {
  let [context, keys] = key.split(":");
  let keyParts = keys.split(".");

  let locals: any = localsByContext[context];
  if (locals == null) return defaultT(key);

  for (let keyPart of keyParts) {
    locals = locals[keyPart];
    if (locals == null) return defaultT(key);
  }

  return locals;
}

function defaultT(key: string) {
  let [context, keys] = key.split(":");
  let keyParts = keys.split(".");

  let locals: any = defaultLocalsByContext[context];
  if (locals == null) return key;

  for (let keyPart of keyParts) {
    locals = locals[keyPart];
    if (locals == null) return key;
  }

  return locals;
}
