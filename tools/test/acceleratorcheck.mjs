/** Consumed accelerators persist, stack, spend inventory and enforce the five-use limit. */
import assert from "node:assert/strict";

const flatten = (value, prefix = "") => Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return entry && typeof entry === "object" && !Array.isArray(entry)
    ? Object.entries(flatten(entry, path)) : [[path, entry]];
}));
const fields = Object.fromEntries(["SchemaField", "NumberField", "StringField", "BooleanField", "ObjectField", "HTMLField"]
  .map(key => [key, class { constructor(options) { this.options = options; } }]));
let id = 0;
globalThis.foundry = { utils: { flattenObject: flatten, randomID: () => `acc${++id}` },
  abstract: { TypeDataModel: class {} }, data: { fields } };
const warnings = [], messages = [];
globalThis.game = { user: { isGM: true }, i18n: { localize: key => key,
  format: (key, args) => `${key}: ${JSON.stringify(args)}` } };
globalThis.ui = { notifications: { warn: key => warnings.push(key) } };
globalThis.ChatMessage = { getSpeaker: () => ({}) };
globalThis.Roll = class {
  constructor(formula) { this.formula = formula; this.total = 5; }
  async evaluate() { return this; }
  async toMessage(data) { messages.push([this.formula, data]); }
};
globalThis.Actor = class {
  async _preUpdate() { return true; }
  async update(changes, options = {}) {
    if (await this._preUpdate(changes, options, game.user) === false) return null;
    for (const [path, value] of Object.entries(changes)) {
      const keys = path.split(".");
      let obj = this;
      for (const key of keys.slice(0, -1)) obj = obj[key] ??= {};
      if (keys.at(-1).startsWith("-=")) delete obj[keys.at(-1).slice(2)];
      else obj[keys.at(-1)] = value;
    }
    return this;
  }
};
const { default: LobiaActor } = await import("../../module/documents/actor.mjs");
const { default: Trainer } = await import("../../module/data/actor-trainer.mjs");
const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
const { ppMaxMoveKeys } = await import("../../module/data/accelerators.mjs");
const item = (name, quantity = 1) => ({ id: name, name, type: "objet",
  system: { subcategory: "bonus-accelerateur", quantity },
  async update(changes) { this.system.quantity = changes["system.quantity"]; return this; } });
function actor(type, entries) {
  const doc = new LobiaActor();
  doc.type = type;
  doc.name = "Bulbizarre";
  doc.isOwner = true;
  doc.items = new Map(entries.map(entry => [entry.id, entry]));
  doc.system = { accelerators: {}, hp: { base: 10, value: 8 },
    identity: { level: 1, niveau: 1 }, levelDice: "2d4", species: { hpFormula: "2d4" },
    talents: {}, treeProfile: { branches: [{ id: "test", species: "Bulbizarre", labels: { root: "Charge" } }] } };
  Object.defineProperty(doc.system, "acceleratorCount", { get() { return Object.keys(this.accelerators).length; } });
  return doc;
}
const trainerItems = [item("PV Plus"), item("Protéine", 2), item("Boost Physique"), item("PP Plus")];
const trainer = actor("trainer", trainerItems);
await trainer.useAccelerator("PV Plus");
assert.deepEqual(trainer.system.hp, { base: 15, value: 13 });
assert.equal(trainerItems[0].system.quantity, 0);
assert.equal(messages[0][0], "2d4");
await trainer.useAccelerator("Protéine");
await trainer.useAccelerator("Protéine");
await trainer.useAccelerator("Boost Physique");
await trainer.useAccelerator("PP Plus");
assert.equal(trainer.system.acceleratorCount, 5);
trainerItems.push(item("Fer")); trainer.items.set("Fer", trainerItems.at(-1));
await trainer.useAccelerator("Fer");
assert.equal(trainerItems.at(-1).system.quantity, 1);
assert.equal(warnings.at(-1), "LOBIA.Accelerator.limit");
const model = new Trainer();
model.accelerators = trainer.system.accelerators;
model.identity = { niveau: 1 };
assert.equal(model.skillPointsTotal, 2);
assert.equal(model.acceleratorBonuses.stats.attaque, 10);
assert.equal(model.acceleratorBonuses.derived.physique, 2);
model.stats = Object.fromEntries(["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse",
  "charisme", "discretion", "talent", "connaissance"].map(key => [key, { base: 50, mod: 0 }]));
model.combatStyle = "neutre";
model.derivedMods = { physique: 0, special: 0, armure: 0, barriere: 0, initiative: 0 };
model.hp = { base: 15, value: 13 };
model.battle = Object.fromEntries(["deplacement", "action", "actionBonus", "reaction"]
  .map(key => [key, { max: 1, value: 1 }]));
model.type = { secondary: "", third: "", fourth: "" };
model.trees = {}; model.treeRolls = {};
model.prepareDerivedData();
assert.equal(model.stats.attaque.total, 60);
assert.equal(model.derived.physique.total, 8);
game.user.isGM = false;
await trainer.removeAccelerator("acc1");
assert.deepEqual(trainer.system.hp, { base: 15, value: 13 });
assert.equal(await trainer.update({ "system.accelerators.-=acc1": null }), null);
game.user.isGM = true;
await trainer.removeAccelerator("acc1");
assert.deepEqual(trainer.system.hp, { base: 10, value: 8 });
assert.equal(trainer.system.acceleratorCount, 4);
await trainer.removeAccelerator("acc5"); // PP Plus: its tree point is derived from the saved entry.
model.accelerators = trainer.system.accelerators;
assert.equal(model.skillPointsTotal, 1);
assert.equal(trainerItems[0].system.quantity, 0); // Removing an effect does not return the item.
const unused = item("Fer", 2);
unused.delete = async () => { trainer.items.delete(unused.id); return unused; };
trainer.items.set(unused.id, unused);
const beforeUnusedRemoval = trainer.system.acceleratorCount;
game.user.isGM = false;
assert.equal(await trainer.removeUnusedAccelerator(unused.id), undefined);
assert.equal(trainer.items.has(unused.id), true);
game.user.isGM = true;
await trainer.removeUnusedAccelerator(unused.id);
assert.equal(trainer.items.has(unused.id), false);
assert.equal(trainer.system.acceleratorCount, beforeUnusedRemoval);
assert.deepEqual(trainer.system.hp, { base: 10, value: 8 });

const pokemonItems = [item("PP Max"), item("PP Plus"), item("Protéine"), item("Boost Armure")];
const pokemon = actor("pokemon", pokemonItems);
assert.ok(pokemon.availableAcceleratorMoves.some(move => move.name === "Charge"));
const move = pokemon.availableAcceleratorMoves.find(entry => entry.name === "Charge");
await pokemon.useAccelerator("PP Max", move.key);
assert.deepEqual([...ppMaxMoveKeys(pokemon.system.accelerators)], [move.key]);
assert.equal(ppMaxMoveKeys({ other: { name: "Protéine", moveKey: move.key } }).size, 0);
assert.ok(!pokemon.availableAcceleratorMoves.some(entry => entry.key === move.key));
assert.equal(pokemonItems[0].system.quantity, 0);
await pokemon.useAccelerator("PP Plus");
await pokemon.useAccelerator("Protéine");
await pokemon.useAccelerator("Boost Armure");
const pokeModel = new Pokemon();
pokeModel.accelerators = pokemon.system.accelerators;
pokeModel.identity = { level: 1 };
assert.equal(pokeModel.pokemonTreePointsTotal, 2);
pokeModel.stats = Object.fromEntries(["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"]
  .map(key => [key, { base: 50, mod: 0 }]));
pokeModel.combatStyle = "neutre";
pokeModel.derivedMods = model.derivedMods;
pokeModel.hp = { base: 10, value: 10 };
pokeModel.battle = Object.fromEntries(["deplacement", "action", "actionBonus", "reaction"]
  .map(key => [key, { max: 1, value: 1 }]));
pokeModel.pokemonTrees = {}; pokeModel.pokemonTreeRolls = {};
pokeModel.prepareDerivedData();
assert.equal(pokeModel.derived.physique.total, 5);
assert.equal(pokeModel.stats.attaque.total, 55);
assert.equal(pokeModel.derived.armure.total, 6);
Object.defineProperty(pokeModel, "treeProfile", { value: { branches: [
  { id: "first" }, { id: "dominant-feu", dominant: true }, { id: "second" },
  { id: "third" }, { id: "fourth" }, { id: "fifth" }
] } });
assert.deepEqual(pokeModel.ctBranches.map(branch => branch.id), ["first", "second", "third", "fourth"]);
pokemon.system.ctBranches = pokeModel.ctBranches;
pokemon.system.ctMoves = {};
await pokemon.setCtMove("dominant-feu", move.key);
await pokemon.setCtMove("fifth", move.key);
await pokemon.setCtMove("first", "not-a-move");
assert.deepEqual(pokemon.system.ctMoves, {});
await pokemon.removeAccelerator("acc6"); // PP Max grants a move until its entry is removed.
assert.equal(ppMaxMoveKeys(pokemon.system.accelerators).size, 0);
assert.ok(pokemon.availableAcceleratorMoves.some(entry => entry.key === move.key));
pokemon.pack = "lobia.pokemons";
assert.equal(await pokemon.update({ "system.accelerators.fake": { name: "PP Plus" } }), null);
assert.equal(await pokemon.removeUnusedAccelerator("PP Plus"), undefined);
assert.equal(pokemon.items.has("PP Plus"), true);
await pokemon.removeAccelerator("acc7");
assert.equal(pokemon.system.acceleratorCount, 3);
pokemon.pack = null;
await pokemon.removeAccelerator("acc7");
pokeModel.accelerators = pokemon.system.accelerators;
assert.equal(pokeModel.pokemonTreePointsTotal, 1);
await pokemon.setCtMove("first", move.key);
assert.equal(pokemon.system.ctMoves.first, move.key);
await pokemon.setCtMove("first", "");
assert.deepEqual(pokemon.system.ctMoves, {});
pokemon.isOwner = false;
await pokemon.setCtMove("second", move.key);
assert.deepEqual(pokemon.system.ctMoves, {});
const failingItem = item("Calcium");
const failed = actor("pokemon", [failingItem]);
failed.update = async () => null;
await failed.useAccelerator("Calcium");
assert.equal(failingItem.system.quantity, 1);
assert.equal(failed.system.acceleratorCount, 0);
assert.equal((await trainer.useAccelerator("PP Max", move.key)), undefined);
console.log("Accelerators: HP roll, stacked stats, tree points, PP Max, inventory and five-use limit: OK");
