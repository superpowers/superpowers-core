import ListById = require("./base/ListById");
import _ = require("lodash");

var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

class Projects extends ListById {
  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", maxLength: 300 }
  }

  constructor(pub) {
    super(pub, Projects.schema, this.generateProjectId);
  }

  generateProjectId(): string {
    var id: string = null;

    while (true) {
      id = "";
      for (var i = 0; i < 4; i++) id += _.sample(characters);
      if (this.byId[id] == null) break;
    }

    return id;
  }
}
export = Projects;
