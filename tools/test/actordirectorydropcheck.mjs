import assert from "node:assert/strict";
import { allowCompendiumActorCopies } from "../../module/actor-directory-drop.mjs";

class ActorDirectory {
  constructor(collection) { this.collection = collection; }
  _entryAlreadyExists(entry) { return this.collection.has(entry.id); }
}
globalThis.foundry = { applications: { sidebar: { tabs: { ActorDirectory } } } };
allowCompendiumActorCopies();

const directory = new ActorDirectory(new Map([["shared-id", { id: "shared-id" }]]));
assert.equal(directory._entryAlreadyExists({ id: "shared-id", inCompendium: true }), false);
assert.equal(directory._entryAlreadyExists({ id: "different-id", inCompendium: true }), false);
assert.equal(directory._entryAlreadyExists({ id: "shared-id", inCompendium: false }), true);
assert.equal(directory._entryAlreadyExists({ id: "different-id", inCompendium: false }), false);
console.log("Actor compendium drop collision: PASS");
