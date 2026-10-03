import assert from "node:assert/strict";
import { migrateWorldPokemonIdentity } from "../../module/data/pokemon-identity.mjs";

const actors = [
  { name: "Férosinge", type: "pokemon", system: { identity: { nickname: "Singe" }, species: {} } },
  { name: "Mystère", type: "pokemon", system: { identity: { nickname: "" }, species: {} } },
  { name: "Dresseur", type: "trainer", system: { identity: {} } }
];
let writes = 0;
for (const actor of actors) actor.update = async changes => {
  writes++;
  for (const [path, value] of Object.entries(changes)) {
    const keys = path.split(".");
    const field = keys.slice(0, -1).reduce((obj, key) => obj[key] ??= {}, actor);
    field[keys.at(-1)] = value;
  }
};
globalThis.game = { user: { isGM: false }, actors };
await migrateWorldPokemonIdentity();
assert.equal(writes, 0);
game.user.isGM = true;
await migrateWorldPokemonIdentity();
assert.equal(writes, 2);
assert.deepEqual([actors[0].name, actors[0].system.species.name], ["Singe", "Férosinge"]);
assert.deepEqual([actors[1].name, actors[1].system.identity.nickname,
  actors[1].system.species.name], ["Mystère", "Mystère", "Mystère"]);
await migrateWorldPokemonIdentity();
assert.equal(writes, 2);
console.log("Pokémon species and nickname migration: OK");
