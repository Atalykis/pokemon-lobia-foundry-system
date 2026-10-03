/** PV + keeps each cell's roll permanently while refunding inactive HP on lock/reset. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const fields = {};
for (const name of ["NumberField", "StringField", "HTMLField", "ObjectField", "BooleanField", "SchemaField"]) {
  fields[name] = class { constructor(options = {}) { this.options = options; } };
}
globalThis.foundry = {
  abstract: { TypeDataModel: class { static migrateData(source) { return source; } } },
  data: { fields }, applications: { api: { DialogV2: { confirm: async () => true } } }
};
function applyPath(root, path, value) {
  const parts = path.split(".");
  let target = root;
  for (const part of parts.slice(0, -1)) target = target[part] ??= {};
  const key = parts.at(-1);
  if (key.startsWith("-=")) delete target[key.slice(2)];
  else target[key] = value;
}
globalThis.Actor = class {
  constructor(data) { Object.assign(this, data); }
  async update(changes) {
    for (const [path, value] of Object.entries(changes)) applyPath(this, path, value);
    this.system.prepareDerivedData();
    return this;
  }
};
const formulas = [], messages = [];
const results = [6, 7, 8, 9];
globalThis.Roll = class {
  constructor(formula) { this.formula = formula; formulas.push(formula); this.total = results.shift(); }
  async evaluate() { return this; }
  async toMessage(message) { messages.push(message); }
};
globalThis.ChatMessage = { getSpeaker: () => ({}) };
globalThis.game = { i18n: { localize: key => key, format: (key, values) => `${key}: ${JSON.stringify(values)}` } };
const warnings = [];
globalThis.ui = { notifications: { warn: warning => warnings.push(warning) } };
const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
const { default: LobiaActor } = await import("../../module/documents/actor.mjs");
const { pokemonHpDice, isPokemonHpBonus } = await import("../../module/data/pokemon-hp.mjs");
assert.equal(pokemonHpDice("10 + Niv(2D4)"), "2d4"); // Férosinge
assert.equal(pokemonHpDice("12 + Niv(3D4)"), "3d4");
assert.equal(pokemonHpDice("3D4"), "3d4");
assert.equal(pokemonHpDice("3d4 + 20"), null);
assert.equal(pokemonHpDice("12"), null);
assert.equal(isPokemonHpBonus("PV+"), true);

function makeActor(name, trees, formula = "") {
  const system = new Pokemon();
  Object.assign(system, {
    parent: { name }, identity: { level: 20, nature: "" },
    species: { hpFormula: formula }, pokemonTrees: structuredClone(trees), pokemonTreeRolls: {},
    pokemonTreeHpHistory: {},
    hp: { value: 12, base: 12 },
    stats: Object.fromEntries(["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"]
      .map(key => [key, { base: 50, mod: 0 }])),
    derivedMods: { armure: 0, barriere: 0, physique: 0, special: 0, initiative: 0 },
    battle: Object.fromEntries(["deplacement", "action", "actionBonus", "reaction"]
      .map(key => [key, { value: 1, max: 1 }]))
  });
  system.prepareDerivedData();
  return new LobiaActor({ name, type: "pokemon", system });
}
const ancestors = { root: true, a1: true, mid1: true, a2: true, mid2: true };
const caninos = makeActor("Caninos", { "caninos-2": ancestors });
assert.equal(caninos.system.isPokemonNodeAvailable("caninos-2", "a3"), true);
await Promise.all([caninos.unlockPokemonNode("caninos-2", "a3"), caninos.unlockPokemonNode("caninos-2", "a3")]);
assert.deepEqual(formulas, ["2d4"]);
assert.equal(caninos.system.pokemonTreeRolls["caninos-2-a3"], 6);
assert.equal(caninos.system.pokemonTreeHpHistory["caninos-2-a3"], 6);
assert.deepEqual([caninos.system.hp.value, caninos.system.hp.max, caninos.system.hp.bonus], [18, 18, 6]);
assert.match(messages[0].flavor, /2d4/);
await caninos.lockPokemonNode("caninos-2", "mid2"); // cascades into a3
assert.equal(caninos.system.pokemonTrees["caninos-2"].a3, undefined);
assert.deepEqual(caninos.system.pokemonTreeRolls, {});
assert.equal(caninos.system.pokemonTreeHpHistory["caninos-2-a3"], 6);
assert.deepEqual([caninos.system.hp.value, caninos.system.hp.max], [12, 12]);
await caninos.unlockPokemonNode("caninos-2", "mid2");
await caninos.unlockPokemonNode("caninos-2", "a3");
assert.deepEqual(formulas, ["2d4"]); // the same cell reuses its result
assert.equal(caninos.system.hp.max, 18);
await caninos.lockPokemonNode("caninos-2", "mid2");

// Older sheets may have spent a PV + point before dice were implemented.
caninos.system.pokemonTrees["caninos-2"] = { ...ancestors, a3: true };
await caninos.rollPokemonHpBonus("caninos-2", "a3");
await caninos.rollPokemonHpBonus("caninos-2", "a3");
assert.deepEqual(formulas, ["2d4"]);
assert.equal(caninos.system.pokemonTreeRolls["caninos-2-a3"], 6);
assert.equal(caninos.system.hp.max, 18);
await caninos.resetPokemonTree();
assert.deepEqual(caninos.system.pokemonTreeRolls, {});
assert.equal(caninos.system.pokemonTreeHpHistory["caninos-2-a3"], 6);
assert.deepEqual([caninos.system.hp.value, caninos.system.hp.max], [12, 12]);
for (const node of ["root", "a1", "mid1", "a2", "mid2", "a3"]) await caninos.unlockPokemonNode("caninos-2", node);
assert.deepEqual(formulas, ["2d4"]);
assert.equal(caninos.system.hp.max, 18);
await caninos.resetPokemonTree();
await caninos.resetPokemonTree();
assert.deepEqual([caninos.system.hp.value, caninos.system.hp.max], [12, 12]);

const colossinge = makeActor("Colossinge", {
  "ferosinge-2": ancestors, colossinge: { ...ancestors }
}, "12 + Niv(3D4)");
assert.equal(colossinge.system.isPokemonNodeAvailable("ferosinge-2", "b3"), true);
assert.equal(colossinge.system.isPokemonNodeAvailable("colossinge", "b3"), true);
await colossinge.unlockPokemonNode("ferosinge-2", "b3");
assert.equal(colossinge.system.isPokemonNodeAvailable("colossinge", "b3"), true);
await colossinge.unlockPokemonNode("colossinge", "b3");
assert.deepEqual(formulas, ["2d4", "3d4", "3d4"]);
assert.deepEqual([colossinge.system.hp.bonus, colossinge.system.hp.max, colossinge.system.hp.value], [15, 27, 27]);
await colossinge.lockPokemonNode("ferosinge-2", "b3");
assert.deepEqual([colossinge.system.hp.bonus, colossinge.system.hp.max, colossinge.system.hp.value], [8, 20, 20]);
await colossinge.resetPokemonTree();
assert.deepEqual([colossinge.system.hp.bonus, colossinge.system.hp.max, colossinge.system.hp.value], [0, 12, 12]);
assert.deepEqual(colossinge.system.pokemonTreeHpHistory,
  { "ferosinge-2-b3": 7, "colossinge-b3": 8 });

const custom = makeActor("Caninos", { "caninos-2": ancestors }, "12");
await custom.unlockPokemonNode("caninos-2", "a3");
assert.equal(custom.system.pokemonTrees["caninos-2"].a3, undefined);
assert.equal(formulas.length, 3);
assert.equal(warnings.length, 1);
const diceOnly = makeActor("Caninos", { "caninos-2": ancestors }, "3D4");
await diceOnly.unlockPokemonNode("caninos-2", "a3");
assert.equal(formulas.at(-1), "3d4");
// Actors with active results from before the history field still keep them on reset.
diceOnly.system.pokemonTreeHpHistory = {};
await diceOnly.resetPokemonTree();
assert.equal(diceOnly.system.pokemonTreeHpHistory["caninos-2-a3"], 9);
assert.equal(diceOnly.system.hp.max, 12);
const migrated = Pokemon.migrateData({ hp: { value: 20, max: 20 }, pokemonTreeRolls: { "caninos-2-a3": 6 } });
assert.equal(migrated.hp.base, 14);
assert.equal(migrated.pokemonTreeHpHistory["caninos-2-a3"], 6);
assert.equal(Pokemon.migrateData({ pokemonTreeRolls: { "caninos-2-a3": 6 },
  pokemonTreeHpHistory: { "caninos-2-a3": 5 } }).pokemonTreeHpHistory["caninos-2-a3"], 5);
const Handlebars = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/")("handlebars");
Handlebars.registerHelper("localize", key => key);
const html = Handlebars.compile(fs.readFileSync("templates/actor/pokemon-tree.hbs", "utf8"))({
  tab: { id: "tree", group: "sheet", active: true }, pokemonTreePoints: { remaining: 1, total: 10, spent: 9 },
  pokemonBranches: [{ rows: [[
    { id: "a3", branch: "caninos-2", label: "PV +", status: "unlocked", hpRollMissing: true },
    { id: "b3", branch: "caninos-2", label: "PV +", status: "unlocked", hpRoll: 6 },
    { id: "end", branch: "caninos-2", label: "PV +", status: "locked", hpSaved: 7 }
  ]] }]
});
assert.equal((html.match(/data-action="rollPokemonHpBonus"/g) ?? []).length, 1);
assert.match(html, /\+6 PV/);
assert.match(html, /\+7 PV/);
console.log("Pokémon PV +: saved per-cell rolls survive locks/resets and restore the same HP: OK");
