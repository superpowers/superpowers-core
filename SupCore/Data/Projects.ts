import ListById from "./Base/ListById";
import * as _ from "lodash";

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export default class Projects extends ListById {
  static schema: SupCore.Data.Schema = {
    name: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", maxLength: 300 },
    formatVersion: { type: "number?" },
    systemId: { type: "string" }
  };

  static sort(a: SupCore.Data.ProjectManifestPub, b: SupCore.Data.ProjectManifestPub) {
    return a.name.localeCompare(b.name);
  }

  pub: SupCore.Data.ProjectManifestPub[];
  byId: { [id: string]: SupCore.Data.ProjectManifestPub; };

  constructor(pub: SupCore.Data.ProjectManifestPub[]) {
    super(pub, Projects.schema);
    this.generateNextId = this.generateProjectId;
  }

  private generateProjectId = () => {
    let id: string = null;

    while (true) {
      id = "";
      for (let i = 0; i < 4; i++) id += _.sample(characters);
      if (this.byId[id] == null) break;
    }

    return id;
  };
}
