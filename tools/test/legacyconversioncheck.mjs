import assert from "node:assert/strict";
import { convertLegacyActor } from "../legacy-actor-conversion.mjs";

const base = {
  _id: "legacy", name: "Example", type: "character", flags: { worldbuilding: { old: true } },
  system: {
    health: { value: 19, max: 25 }, power: { value: 7, max: 9 }, biography: "<p>History</p>",
    attributes: {
      Statistiques: {
        attaque: { value: 75 }, attaqueSpe: { value: 50 }, defense: { value: 70 },
        defenseSpe: { value: 60 }, vitesse: { value: 40 }, "discrétion": { value: 5 }
      },
      Modificateurs: { armure: { value: 9 }, initiative: { value: 10 }, "spécial": { value: 5 } }
    }
  }, prototypeToken: { bar1: { attribute: "health" }, bar2: { attribute: "power" } },
  ownership: { default: 0, player: 3 }, img: "picture.png"
};
const original = structuredClone(base);
const { actor: trainer } = convertLegacyActor(base, { root: "Premier défi" });
assert.equal(trainer.type, "trainer");
assert.deepEqual(trainer.system.hp, { value: 19, base: 25 });
assert.deepEqual(trainer.system.stats.discretion, { base: 5, mod: 0 });
assert.equal(trainer.system.derivedMods.armure, 2);
assert.equal(trainer.system.derivedMods.initiative, 2);
assert.equal(trainer.system.derivedMods.special, 0);
assert.equal(trainer.flags.lobia.legacyWorldbuilding.system.power.value, 7);
assert.equal(trainer.ownership.player, 3);
assert.equal(trainer.prototypeToken.bar1.attribute, "hp");
assert.deepEqual(base, original);

const pokemonSource = structuredClone(base);
delete pokemonSource.system.attributes.Statistiques["discrétion"];
const { actor: pokemon, warnings } = convertLegacyActor(pokemonSource, {
  root: "Pokémons", primaryType: "normal"
});
assert.equal(pokemon.type, "pokemon");
assert.equal(pokemon.system.type.primary, "normal");
assert.equal(warnings.length, 0);
const emptyHuman = convertLegacyActor({ ...base, system: { attributes: {} } });
assert.equal(emptyHuman.actor.type, "trainer");
assert.match(emptyHuman.warnings[0], /no recognizable stats/);
console.log("Legacy Actor conversion: PASS");
