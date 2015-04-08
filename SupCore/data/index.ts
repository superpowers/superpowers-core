export import base = require("./base/index");

export import Projects = require("./Projects");

export import Manifest = require("./Manifest");
export import Internals = require("./Internals");
export import Members = require("./Members");
export import Diagnostics = require("./Diagnostics");
export import Entries = require("./Entries");

export import Assets = require("./Assets");
export import Resources = require("./Resources");

export import Rooms = require("./Rooms");
export import Room = require("./Room");
export import RoomUsers = require("./RoomUsers");

export function hasDuplicateName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): boolean {
  siblings.forEach((sibling) => {
    if (sibling.id != id && sibling.name === name) return true;
  });
  return false;
}

export function ensureUniqueName(id: string, name: string, siblings: Array<{ id: string; name: string; }>): string {
  name = name.trim();
  var candidateName = name;
  var nameNumber = 1;

  while (hasDuplicateName(id, candidateName, siblings)) candidateName = `${name} (${nameNumber++})`;
  return candidateName;
}

interface AssetClass { new(id: string, pub: any, serverData?: any): base.Asset; }
export var assetClasses: {[assetName: string]: AssetClass;} = {};
export function registerAssetClass(name: string, assetClass: AssetClass) {
  if (assetClasses[name] != null) {
    console.log(`SupCore.data.registerAssetClass: Tried to register two or more asset classes named "${name}"`);
    return;
  }
  assetClasses[name] = assetClass;
  return
}

interface ComponentConfigClass { new(pub: any): base.ComponentConfig; }
export var componentConfigClasses: {[componentConfigName: string]: ComponentConfigClass} = {}
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
export var resourceClasses: {[resourceName: string]: ResourceClass} = {}
export function registerResource(name: string, resourceClass: ResourceClass) {
  if (resourceClasses[name] != null) {
    console.log(`SupCore.data.registerResource: Tried to register two or more plugin resources named "${name}"`);
    return;
  }
  resourceClasses[name] = resourceClass;
  return
}

// Deprecated
export var assetPlugins = assetClasses;
export var componentConfigPlugins = componentConfigClasses;

export function addAssetPlugin(name: string, assetClass: AssetClass) {
  console.warn("SupCore.data.addAssetPlugin and SupCore.data.assetPlugins are deprecated and will be removed soon. Please use SupCore.data.registerAssetClass and SupCore.data.assetClasses instead.");
  registerAssetClass(name, assetClass);
  return;
}

export function addComponentConfigPlugin(name: string, configClass: ComponentConfigClass) {
  console.warn("SupCore.data.addComponentConfigPlugin and SupCore.data.componentConfigPlugins are deprecated and will be removed soon. Please use SupCore.data.registerComponentConfigClass and SupCore.data.componentConfigClasses instead.");
  registerComponentConfigClass(name, configClass);
  return;
}
