/** GM-only level advancement changes level and both stored HP fields in one update. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const flatten = (value, prefix = "") => Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return entry && typeof entry === "object" && !Array.isArray(entry)
    ? Object.entries(flatten(entry, path)) : [[path, entry]];
}));
globalThis.foundry = { utils: { flattenObject: flatten },
  abstract: { TypeDataModel: class { static migrateData(source) { return source; } } },
  data: { fields: Object.fromEntries(["SchemaField", "NumberField", "StringField", "BooleanField", "ObjectField", "HTMLField"]
    .map(key => [key, class { constructor(options) { this.options = options; } }])) } };
globalThis.game = { user: { isGM: false }, i18n: {
  localize: key => key, format: (key, values) => `${key}: ${JSON.stringify(values)}`
} };
const warnings = [], messages = [], formulas = [];
globalThis.ui = { notifications: { warn: key => warnings.push(key) } };
globalThis.ChatMessage = { getSpeaker: () => ({}) };
let nextRoll = 5;
globalThis.Roll = class {
  constructor(formula) { formulas.push(formula); this.total = nextRoll; }
  async evaluate() { return this; }
  async toMessage(data) { messages.push(data); }
};
globalThis.Actor = class {
  async _preUpdate() { return true; }
  async update(changes, options = {}) {
    if (await this._preUpdate(changes, options, game.user) === false) return null;
    for (const [path, value] of Object.entries(changes)) {
      const parts = path.split(".");
      let target = this;
      for (const part of parts.slice(0, -1)) target = target[part] ??= {};
      if (parts.at(-1).startsWith("-=")) delete target[parts.at(-1).slice(2)];
      else target[parts.at(-1)] = value;
    }
    return this;
  }
};
const { default: LobiaActor } = await import("../../module/documents/actor.mjs");
for (const [type, field] of [["pokemon", "level"], ["trainer", "niveau"]]) {
  const actor = new LobiaActor();
  actor.name = "Test";
  actor.type = type;
  actor.system = { identity: { [field]: 1 }, hp: { base: 10, value: 7 },
    species: { hpFormula: "12 + Niv(3D4)" }, levelDice: "2D4", levelUpRolls: {},
    talents: { first: "anti-bruit", selected: "first" } };
  assert.equal(await actor.update({ [`system.identity.${field}`]: 2 }), null);
  assert.equal(await actor.update({ "system.levelUpRolls.level-2": 50 }), null);
  assert.equal(await actor.update(type === "pokemon" ? { "system.species.hpFormula": "1D4" }
    : { "system.levelDice": "1D4" }), null);
  assert.equal(actor.system.identity[field], 1);
  game.user.isGM = true;
  assert.equal(await actor.update({ [`system.identity.${field}`]: 2 }), null);
  await Promise.all([actor.levelUp(), actor.levelUp()]);
  assert.deepEqual([actor.system.identity[field], actor.system.hp.base, actor.system.hp.value], [2, 15, 12]);
  assert.equal(actor.system.levelUpRolls["level-2"], 5);
  assert.equal(messages.length, type === "pokemon" ? 1 : 3);
  nextRoll = 6;
  if (type === "trainer") actor.system.levelDice = "4D4";
  await actor.levelUp();
  assert.deepEqual([actor.system.identity[field], actor.system.hp.base, actor.system.hp.value], [3, 21, 18]);
  assert.deepEqual(actor.system.levelUpRolls, { "level-2": 5, "level-3": 6 });
  game.user.isGM = false;
  assert.equal(await actor.levelDown(), undefined);
  assert.equal(actor.system.identity[field], 3);
  game.user.isGM = true;
  await actor.levelDown();
  assert.deepEqual([actor.system.identity[field], actor.system.hp.base, actor.system.hp.value], [2, 15, 12]);
  assert.deepEqual(actor.system.levelUpRolls, { "level-2": 5 });
  await actor.levelDown();
  assert.deepEqual([actor.system.identity[field], actor.system.hp.base, actor.system.hp.value], [1, 10, 7]);
  await actor.levelDown(); // No recorded roll for the original level.
  assert.deepEqual([actor.system.identity[field], actor.system.hp.base, actor.system.hp.value], [0, 10, 7]);
  assert.equal(await actor.levelDown(), undefined);
  actor.system.identity[field] = 20;
  await actor.levelUp();
  assert.equal(actor.system.hp.base, 10);
  actor.pack = "lobia.pokemons";
  assert.equal(await actor.levelUp(), undefined);
  assert.equal(await actor.levelDown(), undefined);
  if (type === "pokemon") {
    const changes = { "system.talents.first": "", "system.talents.selected": "first" };
    await actor.update(changes);
    assert.equal(actor.system.talents.selected, "");
  }
  game.user.isGM = false;
  nextRoll = 5;
}
assert.deepEqual(formulas, ["3d4", "3d4", "2d4", "4d4"]);
assert.equal(warnings.filter(key => key === "LOBIA.Level.maximum").length, 2);
assert.equal(warnings.filter(key => key === "LOBIA.Level.gmOnly").length, 6);
assert.equal(warnings.filter(key => key === "LOBIA.Level.gmOnlyFormula").length, 2);
const { default: LobiaPokemon } = await import("../../module/data/actor-pokemon.mjs");
const { default: LobiaTrainer } = await import("../../module/data/actor-trainer.mjs");
for (const [Model, field] of [[LobiaPokemon, "level"], [LobiaTrainer, "niveau"]]) {
  const schema = Model.defineSchema().identity.options[field].options;
  assert.equal(schema.initial, 0);
  assert.equal(schema.min, 0);
}
assert.ok(LobiaPokemon.defineSchema().species.options.name);
const individual = new LobiaActor();
individual.type = "pokemon";
individual.name = "Férosinge";
individual.system = { identity: { nickname: "Férosinge", level: 0 }, species: { name: "Férosinge" },
  pokemonTrees: {}, talents: {} };
game.user.isGM = false;
await individual.update({ "system.identity.nickname": "Singe" });
assert.equal(individual.name, "Singe");
assert.equal(individual.system.species.name, "Férosinge");
game.user.isGM = true;
await individual.update({ "system.species.name": "Colossinge" });
assert.equal(individual.name, "Singe");
assert.equal(individual.system.species.name, "Colossinge");
await individual.update({ "system.identity.nickname": "" });
assert.equal(individual.name, "Colossinge");
assert.equal(individual.system.identity.nickname, "Colossinge");
await individual.update({ name: "Colo" });
assert.equal(individual.system.identity.nickname, "Colo");
game.user.isGM = true;
const missingDice = new LobiaActor();
missingDice.type = "pokemon";
missingDice.name = "Original";
missingDice.system = { identity: { level: 1 }, species: { hpFormula: "" },
  hp: { base: 10, value: 10 }, levelUpRolls: {}, talents: {} };
const beforeInvalid = formulas.length;
await missingDice.levelUp();
assert.equal(formulas.length, beforeInvalid);
assert.equal(missingDice.system.identity.level, 1);
assert.equal(warnings.at(-1), "LOBIA.Level.invalidFormula");
assert.equal(await missingDice.update({ "system.species.hpFormula": "12" }), null);
await missingDice.update({ "system.species.hpFormula": "12 + Niv(3D4)" });
assert.equal(missingDice.system.species.hpFormula, "3d4");

const template = new LobiaActor();
template.type = "pokemon";
template.pack = "lobia.pokemons";
template.system = { identity: { level: 1 }, hp: { base: 10, value: 10 }, talents: {} };
assert.equal(await template.update({ "system.identity.level": 0 }), null);
assert.equal(await template.update({ "system.identity.level": 0 },
  { lobiaPokemonTemplateMigration: true }), template);
assert.equal(template.system.identity.level, 0);
assert.equal(await template.update({ "system.identity.level": 1 },
  { lobiaPokemonTemplateMigration: true }), null);
template.pack = "world.other-pack";
assert.equal(await template.update({ "system.identity.level": 1 },
  { lobiaPokemonTemplateMigration: true }), null);
template.pack = "lobia.pokemons";
game.user.isGM = false;
assert.equal(await template.update({ "system.identity.level": 1 },
  { lobiaPokemonTemplateMigration: true }), null);
game.user.isGM = true;

nextRoll = 4;
for (const [type, field, dice] of [["pokemon", "level", "3d4"], ["trainer", "niveau", "2d4"]]) {
  const fresh = new LobiaActor();
  fresh.name = "Starting character";
  fresh.type = type;
  fresh.system = { identity: { [field]: 0 }, hp: { base: 10, value: 10 },
    species: { hpFormula: "3d4" }, levelDice: "2d4", levelUpRolls: {}, talents: {} };
  await fresh.levelUp();
  assert.deepEqual([fresh.system.identity[field], fresh.system.hp.base, fresh.system.hp.value], [1, 14, 14]);
  assert.equal(fresh.system.levelUpRolls["level-1"], 4);
  assert.equal(formulas.at(-1), dice);
}

const Handlebars = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/")("handlebars");
Handlebars.registerHelper("localize", key => key);
const trainer = Handlebars.compile(fs.readFileSync("templates/actor/trainer-main.hbs", "utf8"));
const playerHtml = trainer({ tab: { id: "main" }, identity: { niveau: 3 } });
const gmHtml = trainer({ tab: { id: "main" }, identity: { niveau: 3 }, canLevelUp: true,
  canLevelDown: true });
const gmDiceHtml = trainer({ tab: { id: "main" }, identity: { niveau: 3 }, canLevelUp: true,
  isGM: true, system: { levelDice: "4D4" } });
assert.doesNotMatch(playerHtml, /data-action="levelUp"/);
assert.doesNotMatch(playerHtml, /data-action="levelDown"/);
assert.match(gmHtml, /data-action="levelUp"/);
assert.match(gmHtml, /data-action="levelDown"/);
assert.doesNotMatch(gmHtml, /name="system.identity.niveau"/);
assert.match(gmDiceHtml, /name="system.levelDice" value="4D4"/);
console.log("Trainer/Pokémon level-up: actor dice, recorded HP gains, GM-only controls and cap OK");
