import ListById from "./Base/ListById";
import * as _ from "lodash";

let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export default class Projects extends ListById {
  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", maxLength: 300 },
    formatVersion: { type: "number?" },
    system: { type: "string" }
  }
  
  static sort(a: SupCore.Data.ProjectManifestPub, b: SupCore.Data.ProjectManifestPub) {
    // FIXME: This fails in NW.js, we can enable it back
    // once the switch to Electron is done.
    // return a.name.localeCompare(b.name);

    let aName = a.name.toLowerCase();
    let bName = b.name.toLowerCase();
    if (aName < bName) return -1;
    if (aName > bName) return 1;
    return 0;
  }

  pub: SupCore.Data.ProjectManifestPub[];
  byId: { [id: string]: SupCore.Data.ProjectManifestPub; };

  constructor(pub: SupCore.Data.ProjectManifestPub[]) {
    super(pub, Projects.schema, this.generateProjectId);
  }

  generateProjectId(): string {
    let id: string = null;

    while (true) {
      id = "";
      for (let i = 0; i < 4; i++) id += _.sample(characters);
      if (this.byId[id] == null) break;
    }

    return id;
  }
}
