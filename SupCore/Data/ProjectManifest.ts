import Hash from "./Base/Hash";

export default class ProjectManifest extends Hash {
  static schema = {
    id: { type: "string" },
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    description: { type: "string", maxLength: 300, mutable: true },
    system: { type: "string" },
    formatVersion: { type: "integer" }
  };

  static currentFormatVersion = 2;
  migratedFromFormatVersion: number;

  constructor(pub: SupCore.Data.ProjectManifestPub) {
    this.migratedFromFormatVersion = ProjectManifest.migrate(pub);

    super(pub, ProjectManifest.schema);
  }
  
  static migrate(pub: SupCore.Data.ProjectManifestPub): number {
    if (pub.formatVersion === ProjectManifest.currentFormatVersion) return null;
    if (pub.formatVersion == null) pub.formatVersion = 0;

    if (pub.formatVersion > ProjectManifest.currentFormatVersion) {
      throw new Error(`This project was created using a more recent version of Superpowers and cannot be loaded. Format version is ${pub.formatVersion} but this version of Superpowers only supports up to ${ProjectManifest.currentFormatVersion}.`);
    }

    let oldFormatVersion = pub.formatVersion;
    
    if (oldFormatVersion === 0) {
      // Nothing to migrate here, the manifest itself didn't change
      // The on-disk project format did though, and will be updated
      // by ProjectServer based on oldFormatVersion
    }

    if (oldFormatVersion <= 1) {
      pub.system = "supGame";
    }

    pub.formatVersion = ProjectManifest.currentFormatVersion;
    return oldFormatVersion;
  }
}
