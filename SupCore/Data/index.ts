import * as Base from "./Base";

import Projects from "./Projects";

import ProjectManifest from "./ProjectManifest";
import Badges from "./Badges";
import Entries from "./Entries";

import Assets from "./Assets";
import Resources from "./Resources";

import Rooms from "./Rooms";
import Room from "./Room";
import RoomUsers from "./RoomUsers";

export {
  Base,
  Projects, ProjectManifest, Badges, Entries,
  Assets, Resources, Rooms, Room, RoomUsers
};

export function hasDuplicateName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): boolean {
  for (const sibling of siblings) {
    if (sibling.id !== id && sibling.name === name) return true;
  }
  return false;
}

export function ensureUniqueName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): string {
  name = name.trim();
  let nameNumber = 1;

  // Look for an already exiting number at the end of the name
  const matches = name.match(/\d+$/);
  if (matches != null) {
    name = name.substring(0, name.length - matches[0].length);
    nameNumber = parseInt(matches[0], 10);
  }

  let candidateName = name;

  while (hasDuplicateName(id, candidateName, siblings)) candidateName = `${name}${++nameNumber}`;
  return candidateName;
}
