import * as base from "./base/index";

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
  base,
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

interface AssetClass { new(id: string, pub: any, serverData?: any): base.Asset; }
export let assetClasses: {[assetName: string]: AssetClass;} = {};
export function registerAssetClass(name: string, assetClass: AssetClass) {
  if (assetClasses[name] != null) {
    console.log(`SupCore.data.registerAssetClass: Tried to register two or more asset classes named "${name}"`);
    return;
  }
  assetClasses[name] = assetClass;
  return
}

interface ComponentConfigClass { new(pub: any): base.ComponentConfig; create(): any; }
export let componentConfigClasses: {[componentConfigName: string]: ComponentConfigClass} = {}
export function registerComponentConfigClass(name: string, configClass: ComponentConfigClass) {
  if (componentConfigClasses[name] != null) {
    console.log(`SupCore.data.registerComponentConfigClass: Tried to register two or more component configuration classes named "${name}"`);
    return;
  }
  componentConfigClasses[name] = configClass;
  return
}

// This registers a plugin * resource * (see SupCore.data.Resources), not just a resource class, hence the name
interface ResourceClass { new(pub: any, serverData?: any): base.Resource; }
export let resourceClasses: {[resourceName: string]: ResourceClass} = {}
export function registerResource(name: string, resourceClass: ResourceClass) {
  if (resourceClasses[name] != null) {
    console.log(`SupCore.data.registerResource: Tried to register two or more plugin resources named "${name}"`);
    return;
  }
  resourceClasses[name] = resourceClass;
  return
}
