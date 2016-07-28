import * as SupData from "./index";
import * as path from "path";

// Plugin resources are assets managed by plugins outside the project's asset tree
// They might be used for project-wide plugin-specific settings for instance
export default class Resources extends SupData.Base.Dictionary {
  constructor(public server: ProjectServer) {
    super();
  }

  acquire(id: string, owner: SupCore.RemoteClient, callback: (err: Error, item: SupCore.Data.Base.Resource) => void) {
    if (this.server.system.data.resourceClasses[id] == null) { callback(new Error(`Invalid resource id: ${id}`), null); return; }

    super.acquire(id, owner, callback);
  }

  _load(id: string) {
    const resourceClass = this.server.system.data.resourceClasses[id];

    const resource = new resourceClass(id, null, this.server);
    resource.load(path.join(this.server.projectPath, `resources/${id}`));

    return resource;
  }
}
