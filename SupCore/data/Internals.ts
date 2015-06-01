import Hash from "./base/Hash";

export default class Internals extends Hash {
  static schema = {
    nextBuildId: { type: "integer", min: 0, mutable: true },
    nextEntryId: { type: "integer", min: 0, mutable: true }
  }

  constructor(pub: any) {
    super(pub, Internals.schema);
  }

  incrementNextEntryId() {
    this.pub.nextEntryId++;
    this.emit("change");
  }

  incrementNextBuildId() {
    this.pub.nextBuildId++;
    this.emit("change");
  }
}
