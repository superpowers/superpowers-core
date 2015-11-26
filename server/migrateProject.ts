import * as fs from "fs";
import * as path from "path";
import * as async from "async";

export default function(server: ProjectServer, callback: (err: Error) => any) {
  let oldVersion = server.data.manifest.migratedFromFormatVersion;
  if (oldVersion == null) { callback(null); return; }

  async.series([
    (cb) => { if (oldVersion < 1) migrateTo1(server, cb); else cb(); }
  ], callback);
}

function migrateTo1(server: ProjectServer, callback: (err: Error) => any) {
  const assetsPath = path.join(server.projectPath, "assets");

  async.series([
    // Delete ArcadePhysics2DSettingsResource, removed in Superpowers v0.13
    // FIXME: This should be done by an init function in the plugin, probably.
    (cb) => { fs.unlink(path.join(server.projectPath, "resources/arcadePhysics2DSettings/resource.json"), (err) => { cb(); }); },
    (cb) => { fs.rmdir(path.join(server.projectPath, "resources/arcadePhysics2DSettings"), (err) => { cb(); }); },

    // Move trashed assets to "trashedAssets" folder
    (cb) => {
      fs.readdir(assetsPath, (err, assetFolders) => {
        if (err != null) throw err;

        let assetFolderRegex = /^[0-9]+-.+$/;
        let trashedAssetFolders: string[] = [];
        for (let assetFolder of assetFolders) {
          if (!assetFolderRegex.test(assetFolder)) continue;

          let assetId = assetFolder.substring(0, assetFolder.indexOf("-"));
          if (server.data.entries.byId[assetId] == null) trashedAssetFolders.push(assetFolder);
        }

        async.each(trashedAssetFolders, server.moveAssetFolderToTrash.bind(server), cb);
      });
    },

    // Delete internals.json and members.json
    (cb) => { fs.unlink(path.join(server.projectPath, "internals.json"), (err) => { cb(); }); },
    (cb) => { fs.unlink(path.join(server.projectPath, "members.json"), (err) => { cb(); }); }
  ], callback);
}
