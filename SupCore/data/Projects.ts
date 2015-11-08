import ListById from "./Base/ListById";
import * as _ from "lodash";

interface ProjectItem {
  id: string;
  name: string;
  description: string;
}

let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export default class Projects extends ListById {
  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", maxLength: 300 }
  }

  pub: ProjectItem[];
  byId: { [id: string]: ProjectItem; };

  constructor(pub: ProjectItem[]) {
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
