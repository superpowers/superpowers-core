import * as async from "async";
import * as readdirRecursive from "recursive-readdir";
import * as path from "path";

export let files = [ "/plugins.json" ];

export function init(pluginNamesByAuthor: { [author: string]: string[] }, callback: (err: Error) => any) {
  let rootPublicPath = path.resolve(`${__dirname}/../public`);

  for (let author in pluginNamesByAuthor) {
    let pluginNames = pluginNamesByAuthor[author];
    for (let pluginName of pluginNames) {
      files.push(`/plugins/${author}/${pluginName}/api.js`);
      files.push(`/plugins/${author}/${pluginName}/components.js`);
      files.push(`/plugins/${author}/${pluginName}/runtime.js`);
    }
  }

  let addEntries = (entries: string[]) => {
    for (let entry of entries) {
      let relativePath = path.relative(rootPublicPath, entry);
      if (path.sep === "\\") relativePath = relativePath.replace(/\\/g, "/");
      files.push(`/${relativePath}`);
    }
  };

  files.push("/SupCore.js", "/SupAPI.js");

  async.parallel([
    (cb: () => any) => { readdirRecursive(`${__dirname}/../public/player`, (err: Error, entries: string[]) => {
      addEntries(entries); cb();
    }); },

    (cb: () => any) => { readdirRecursive(`${__dirname}/../public/system`, (err: Error, entries: string[]) => {
      addEntries(entries); cb();
    }); },
  ], callback);
}
