/** Compare an offline original world and the migrated trial copy. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const [originalRoot, trialRoot] = process.argv.slice(2);
if (!originalRoot || !trialRoot) throw new Error("Pass original and migrated offline world paths");
const foundryRoot = process.env.FOUNDRY_ROOT ?? path.join(os.homedir(), "Downloads", "FoundryVTT-Node-13.351");
const { ClassicLevel } = createRequire(path.join(foundryRoot, "package.json"))("classic-level");
async function docs(root, collection, prefix) {
  const db = new ClassicLevel(path.join(root, collection), { valueEncoding: "json", readOnly: true });
  await db.open();
  const entries = new Map();
  for await (const [key, value] of db.iterator()) {
    if (String(key).startsWith(prefix)) entries.set(String(key), value);
  }
  await db.close();
  return entries;
}
async function compare(collection, prefix, validate) {
  const old = await docs(originalRoot, collection, prefix);
  const next = await docs(trialRoot, collection, prefix);
  assert.deepEqual([...next.keys()], [...old.keys()], `${collection}: same document keys`);
  for (const [key, previous] of old) validate(previous, next.get(key), key);
  return old.size;
}
function actor(previous, next) {
  assert.equal(next._id, previous._id);
  assert.equal(next.name, previous.name);
  assert.equal(next.folder, previous.folder);
  assert.equal(next.img, previous.img);
  assert.deepEqual(next.ownership, previous.ownership);
  assert.ok(["trainer", "pokemon"].includes(next.type));
  assert.deepEqual(next.flags.lobia.legacyWorldbuilding.system, previous.system);
  assert.equal(next.prototypeToken.bar1.attribute, "hp");
  assert.equal(next.system.hp.value, previous.system.health.value);
  assert.equal(next.system.hp.base, previous.system.health.max);
  for (const stat of Object.values(next.system.stats)) {
    assert.ok(Number.isInteger(stat.base) && stat.base >= 0 && stat.base <= 100);
    assert.equal(stat.mod, 0);
  }
}
const actors = await compare("data/actors", "!actors!", actor);
const pack = await compare("packs/pokemons", "!actors!", actor);
const tokens = await compare("data/scenes", "!scenes.tokens!", (previous, next) => {
  assert.equal(next.actorId, previous.actorId);
  assert.equal(next._id, previous._id);
  assert.equal(next.bar1.attribute, "hp");
  assert.equal(next.bar2.attribute, null);
});
const deltas = await compare("data/scenes", "!scenes.tokens.delta!", (previous, next) => {
  assert.equal(next._id, previous._id);
  if (next.flags?.lobia?.legacyWorldbuildingDelta) {
    assert.deepEqual(next.flags.lobia.legacyWorldbuildingDelta, previous.system);
    assert.ok(next.system.hp);
  }
});
const oldManifest = JSON.parse(fs.readFileSync(path.join(originalRoot, "world.json"), "utf8"));
const newManifest = JSON.parse(fs.readFileSync(path.join(trialRoot, "world.json"), "utf8"));
assert.equal(oldManifest.system, "worldbuilding");
assert.equal(newManifest.system, "lobia");
assert.equal(newManifest.flags.lobia.migrationVersion, 1);
assert.deepEqual(newManifest.packs.map(pack => pack.name), oldManifest.packs.map(pack => pack.name));
console.log(`Migration copy PASS: ${actors} Actors, ${pack} pack Actors, ${tokens} tokens, ${deltas} deltas`);
