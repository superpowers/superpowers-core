import * as tv4 from "tv4";

// Server config
let config = {
  type: "object",
  properties: {
    // Deprecated, use mainPort instead
    port: { type: "number" },
    mainPort: { type: "number" },
    buildPort: { type: "number" },
    password: { type: "string" },
    maxRecentBuilds: { type: "number", min: 1 }
  }
};

// Project manifest
let projectManifest = {
  type: "object",
  properties: {
    id: { type: "string", minLength: 4, maxLength: 4 },
    name: { type: "string", minLength: 1, maxLength: 80 },
    description: { type: "string", maxLength: 300 }
  },
  required: [ "id", "name", "description" ]
};

// Project members
let projectMembers = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      cachedUsername: { type: "string" }
    }
  }
};

// Project entries
let projectEntry = {
  type: "object",
  properties: {
    // IDs used to be integers but are now serialized as strings
    id: { type: [ "integer", "string" ] },
    name: { type: "string", minLength: 1, maxLength: 80 },
    type: { type: [ "string", "null" ] },
    children: {
      type: "array",
      items: { $ref: "#/definitions/projectEntry" }
    }
  },
  required: [ "id", "name" ]
};

let projectEntries = {
  definitions: { projectEntry },
  type: "array",
  items: { $ref: "#/definitions/projectEntry" }
};

let schemas: { [name: string]: any } = { config, projectManifest, projectMembers, projectEntries };

function validate(obj: any, schemaName: string) {
  let schema = schemas[schemaName];
  let result = tv4.validateResult(obj, schema);

  if (!result.valid) {
    throw new Error(`${result.error.dataPath} (${result.error.schemaPath}): ${result.error.message}`);
  }

  return true;
}

export { validate };
