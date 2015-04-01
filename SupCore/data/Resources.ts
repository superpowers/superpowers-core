import SupData = require("./index");
import path = require("path");

// Plugin resources are assets managed by plugins outside the project's asset tree
// They might be used for project-wide plugin-specific settings for instance
class Resources extends SupData.base.Dictionary {
  server: any;
  resourceClassesById: any;

  constructor(server, resourceClassesById) {
    super()
    this.server = server;
    this.resourceClassesById = resourceClassesById;
  }

  acquire(id: string, owner, callback: (err: Error, item?: any) => any) {
    if (SupData.resourceClasses[id] == null) { callback(new Error(`Invalid resource id: ${id}`)); return; }

    super.acquire(id, owner, callback);
  }

  _load(id) {
    var resourceClass = SupData.resourceClasses[id];

    var resource = new resourceClass(null, this.server.data);
    resource.load(path.join(this.server.projectPath, `resources/${id}`));

    return resource;
  }
}

export = Resources;
