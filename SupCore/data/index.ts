import * as Base from "./Base";

import Projects from "./Projects";

import Manifest from "./Manifest";
import Diagnostics from "./Diagnostics";
import Entries from "./Entries";

import Assets from "./Assets";
import Resources from "./Resources";

import Rooms from "./Rooms";
import Room from "./Room";
import RoomUsers from "./RoomUsers";

export {
  Base,
  Projects, Manifest, Diagnostics, Entries,
  Assets, Resources, Rooms, Room, RoomUsers
};

export function hasDuplicateName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): boolean {
  for (let sibling of siblings) {
    if (sibling.id !== id && sibling.name === name) return true;
  }
  return false;
}

export function ensureUniqueName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): string {
  name = name.trim();
  let candidateName = name;
  let nameNumber = 1;

  while (hasDuplicateName(id, candidateName, siblings)) candidateName = `${name} (${nameNumber++})`;
  return candidateName;
}
