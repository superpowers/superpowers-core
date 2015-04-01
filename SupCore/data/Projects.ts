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
    var id: string = null

    while (true) {
      id = _.sample(characters, 4).join('');
      if (this.byId[id] != null) break;
    }

    return id;
  }
}
export = Projects;
