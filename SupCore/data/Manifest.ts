import Hash from "./base/Hash";

interface ManifestPub {
  id: string;
  name: string;
  description: string;
  formatVersion: number;
}

export default class Manifest extends Hash {
  static schema = {
    id: { type: "string" },
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    description: { type: "string", maxLength: 300, mutable: true },
    formatVersion: { type: "integer" }
  }

  static currentFormatVersion = 1;
  migratedFromFormatVersion: number;

  constructor(pub: ManifestPub) {
    this.migratedFromFormatVersion = Manifest.migrate(pub);

    super(pub, Manifest.schema);
  }
  
  static migrate(pub: ManifestPub): number {
    if (pub.formatVersion === Manifest.currentFormatVersion) return null;
    if (pub.formatVersion == null) pub.formatVersion = 0;

    if (pub.formatVersion > Manifest.currentFormatVersion) {
      throw new Error(`This project was created using a more recent version of Superpowers and cannot be loaded. Format version is ${pub.formatVersion} but this version of Superpowers only supports up to ${Manifest.currentFormatVersion}.`);
    }

    let oldFormatVersion = pub.formatVersion;
    
    if (oldFormatVersion === 0) {
      // Nothing to migrate here, the manifest itself didn't change
      // The on-disk project format did though, and will be updated
      // by ProjectServer based on oldFormatVersion
    }

    pub.formatVersion = Manifest.currentFormatVersion;
    return oldFormatVersion;
  }
}
