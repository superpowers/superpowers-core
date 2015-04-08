import SupData = require("./index");
import path = require("path");

// Plugin resources are assets managed by plugins outside the project's asset tree
// They might be used for project-wide plugin-specific settings for instance
class Resources extends SupData.base.Dictionary {
  server: any;

  constructor(server: any) {
    super()
    this.server = server;
  }

  acquire(id: string, owner: any, callback: (err: Error, item?: any) => any) {
    if (SupData.resourceClasses[id] == null) { callback(new Error(`Invalid resource id: ${id}`)); return; }

    super.acquire(id, owner, callback);
  }

  _load(id: string) {
    var resourceClass = SupData.resourceClasses[id];

    var resource = new resourceClass(null, this.server.data);
    resource.load(path.join(this.server.projectPath, `resources/${id}`));

    return resource;
  }
}

export = Resources;
