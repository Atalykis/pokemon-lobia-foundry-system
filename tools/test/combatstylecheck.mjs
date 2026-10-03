/** Stances affect prepared stats, derived values, damage and turn expiry. */
import assert from "node:assert/strict";
const fields = {};
for (const name of ["SchemaField", "StringField", "NumberField", "BooleanField", "HTMLField", "ObjectField"]) {
  fields[name] = class { constructor(options) { this.options = options; } };
}
globalThis.foundry = { abstract: { TypeDataModel: class { static migrateData(source) { return source; } } }, data: { fields } };
globalThis.game = { i18n: { localize: key => key }, user: { isActiveGM: true } };
const { LOBIA } = await import("../../module/config.mjs");
const { COMBAT_STYLES, combatStyleDamageFormula } = await import("../../module/data/combat-styles.mjs");
const { default: Trainer } = await import("../../module/data/actor-trainer.mjs");
const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
assert.deepEqual(Object.keys(COMBAT_STYLES), ["neutre", "devastateur", "puissant", "rapide", "defensif"]);
assert.deepEqual(Trainer.defineSchema().combatStyle.options.choices, Object.keys(COMBAT_STYLES));
assert.deepEqual(Pokemon.defineSchema().combatStyle.options.choices, Object.keys(COMBAT_STYLES));

function prepare(model) {
  Object.assign(model, {
    hp: { base: 10, value: 10 },
    stats: Object.fromEntries(["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"]
      .map((key, i) => [key, { base: [65, 35, 55, 35, 35][i], mod: 0 }])),
    derivedMods: { armure: 0, barriere: 0, initiative: 0, physique: 0, special: 0 },
    battle: Object.fromEntries(["deplacement", "action", "actionBonus", "reaction"]
      .map(key => [key, { value: 1, max: 1 }])),
    trees: {}, treeRolls: {}, pokemonTrees: {}, identity: { nature: "brave", niveau: 1, level: 1 },
    type: { secondary: "", third: "", fourth: "" }, combatStyle: "rapide"
  });
  if (model instanceof Trainer) {
    for (const key of ["charisme", "discretion", "talent", "connaissance"]) model.stats[key] = { base: 50, mod: 0 };
  }
  model.prepareDerivedData();
}
const trainer = new Trainer();
prepare(trainer);
assert.equal(trainer.stats.attaque.total, 90);
assert.equal(trainer.stats.defense.total, 30);
assert.equal(trainer.derived.armure.total, 3);
assert.equal(trainer.stats.charisme.styleBonus, 0);
trainer.combatStyle = "devastateur";
trainer.prepareDerivedData();
assert.equal(trainer.stats.attaque.total, 40);
assert.equal(trainer.stats.attaqueSpeciale.total, 10);
assert.equal(trainer.stats.defense.total, 55);
assert.equal(trainer.combatStyleEffects.area, true);
trainer.combatStyle = "neutre";
trainer.prepareDerivedData();
assert.equal(trainer.stats.attaque.total, 65);
assert.equal(trainer.stats.attaque.base, 65);

const pokemon = new Pokemon();
prepare(pokemon);
assert.equal(pokemon.stats.attaque.total, 100); // +25 style, +10 Nature
assert.equal(pokemon.stats.attaque.styleBonus, 25);
assert.equal(pokemon.stats.defense.total, 30);
assert.equal(pokemon.derived.physique.total, 10);
pokemon.combatStyle = "neutre";
pokemon.prepareDerivedData();
assert.equal(pokemon.stats.attaque.total, 75);
assert.equal(pokemon.stats.defense.total, 55);
assert.equal(pokemon.stats.attaque.base, 65);
assert.equal(combatStyleDamageFormula("2d8+3", "puissant"), "(2d8+3)*2");
assert.equal(combatStyleDamageFormula("2d8+3", "defensif"), "floor((2d8+3)/2)");
assert.equal(combatStyleDamageFormula("2d8+3", "neutre"), "2d8+3");
assert.equal(COMBAT_STYLES.puissant.received, 2);
assert.equal(COMBAT_STYLES.defensif.immuneStat, true);

const { resetCombatStyleOnTurnChange, resetCombatStylesOnDelete } = await import("../../module/combat/style-turn.mjs");
const updated = [];
const actor = (type, style) => ({ type, system: { combatStyle: style }, async update(change) {
  updated.push([type, style, change]); this.system.combatStyle = change["system.combatStyle"];
} });
const fast = actor("pokemon", "rapide");
const powerful = actor("trainer", "puissant");
const combat = { combatants: new Map([["one", { actor: fast }], ["two", { actor: powerful }]]) };
await resetCombatStyleOnTurnChange(combat, { round: 1, combatantId: "one" }, { round: 1, combatantId: "two" });
assert.equal(fast.system.combatStyle, "neutre");
assert.equal(updated.length, 1);
await resetCombatStyleOnTurnChange(combat, { round: 1, combatantId: "two" }, { round: 2, combatantId: "one" });
assert.equal(powerful.system.combatStyle, "puissant");
game.user.isActiveGM = false;
fast.system.combatStyle = "devastateur";
await resetCombatStyleOnTurnChange(combat, { round: 2, combatantId: "one" }, { round: 2, combatantId: "two" });
assert.equal(fast.system.combatStyle, "devastateur");
game.user.isActiveGM = true;
await resetCombatStylesOnDelete(combat);
assert.equal(fast.system.combatStyle, "neutre");
assert.equal(powerful.system.combatStyle, "puissant");
console.log("Combat styles: trainer/Pokémon stats, Nature, damage and GM turn cleanup: OK");
