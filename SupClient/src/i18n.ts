import * as cookies from "js-cookie";
import * as path from "path";
import * as _ from "lodash";

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

interface File {
  root: string;
  name: string;
}

let defaultLocalsByContext: LocalsByContext = {};
let localsByContext: LocalsByContext = {};

export function load(files: File[], callback: Function) {
  let filesToLoad = 0;
  let allFilesRequested = false;

  let loadFile = (language: string, file: File, root: LocalsByContext) => {
    filesToLoad += 1;

    let filePath = path.join(file.root, `locales/${language}`, `${file.name}.json`);
    console.log(filePath);

    window.fetch(filePath).then((response) => {
      if (response.status === 404) {
        filesToLoad -= 1;
        if (filesToLoad === 0 && allFilesRequested) callback();
      } else {
        response.json().then((data) => {
          if (root[file.name] == null) root[file.name] = data;
          else root[file.name] = _.merge(root[file.name], data) as any;

          filesToLoad -= 1;
          if (filesToLoad === 0 && allFilesRequested) callback();
        });
      }
    });
  };

  for (let file of files) {
    loadFile(language, file, localsByContext);
    if (language !== "en") loadFile("en", file, defaultLocalsByContext);
  }
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
