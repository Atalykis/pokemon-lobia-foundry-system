/** Nature, measurements, model preparation, roll actions and Principal part. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const fields = {};
for (const name of ["SchemaField", "StringField", "NumberField", "BooleanField", "HTMLField", "ObjectField"]) {
  fields[name] = class { constructor(options = {}) { this.options = options; } };
}
globalThis.foundry = {
  abstract: { TypeDataModel: class { static migrateData(data) { return data; } } },
  data: { fields },
  utils: { flattenObject: object => Object.fromEntries(Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === "object" ? Object.entries(value).map(([field, fieldValue]) => [`${key}.${field}`, fieldValue]) : [[key, value]])) }
};
globalThis.game = { user: { isGM: false }, i18n: { localize: value => value, format: (key, data) => `${key}:${JSON.stringify(data)}` } };
const { POKEMON_NATURES, measurementsForRoll } = await import("../../module/data/pokemon-natures.mjs");
const { natureForRoll } = await import("../../module/data/nature-registry.mjs");
const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
assert.equal(POKEMON_NATURES.length, 25);
for (let i = 1; i <= 100; i++) assert.equal(natureForRoll(i).key, POKEMON_NATURES[Math.floor((i - 1) / 4)][0]);
assert.deepEqual(measurementsForRoll(70, 60, 6), { size: 72, weight: 7.2 });
const stat = base => ({ base, mod: 0 });
const model = new Pokemon();
Object.assign(model, {
  hp: { value: 10, base: 10 }, identity: { nature: "brave" },
  stats: { attaque: stat(65), attaqueSpeciale: stat(35), defense: stat(55), defenseSpeciale: stat(35), vitesse: stat(35) },
  derivedMods: { armure: 0, barriere: 0, initiative: 0, physique: 0, special: 0 },
  battle: { action: { value: 1, max: 1 } }
});
model.prepareDerivedData();
assert.equal(model.stats.attaque.total, 75);
assert.equal(model.stats.vitesse.total, 25);
assert.equal(model.derived.physique.total, 7);
assert.equal(model.derived.initiative.total, 4);
model.identity.nature = "bizarre";
model.prepareDerivedData();
assert.equal(model.stats.attaque.total, 65);
assert.equal(model.stats.vitesse.natureBonus, 0);
assert.equal(Pokemon.migrateData({ identity: { nature: "brave" } }).identity.natureRolled, true);
assert.equal("hidden" in Pokemon.defineSchema().talents.options, false);

globalThis.Actor = class {
  constructor(system) { this.type = "pokemon"; this.name = "Lipoutti"; this.system = system; }
  async _preUpdate() { return true; }
  async update(changes, options = {}) {
    if (await this._preUpdate(changes, options, game.user) === false) return;
    for (const [path, value] of Object.entries(changes)) {
      const keys = path.split(".").slice(1);
      let target = this.system;
      for (const key of keys.slice(0, -1)) target = target[key];
      target[keys.at(-1)] = value;
    }
  }
};
let nextRoll = 70;
const messages = [];
globalThis.Roll = class {
  constructor(formula) { assert.equal(formula, "1d100"); this.total = nextRoll; }
  async evaluate() { return this; }
  async toMessage(message) { messages.push(message); }
};
globalThis.ChatMessage = { getSpeaker: () => ({}) };
let warnings = 0;
globalThis.ui = { notifications: { warn: () => warnings++ } };
const { default: LobiaActor } = await import("../../module/documents/actor.mjs");
const actor = new LobiaActor({ identity: { nature: "", natureRolled: false, size: 0, weight: 0,
  averageSize: 60, averageWeight: 6, sizeRoll: 0, shinyRoll: 0, shiny: false, dominant: false } });
await actor.rollPokemonNature();
assert.equal(actor.system.identity.nature, "presse");
assert.equal(actor.system.identity.natureRolled, true);
await actor.rollPokemonMeasurements();
assert.equal(actor.system.identity.size, 72);
assert.equal(actor.system.identity.weight, 7.2);
assert.equal(actor.system.identity.sizeRoll, 70);
assert.equal(actor.system.identity.dominant, false);
nextRoll = 100;
assert.equal(await actor.rollPokemonMeasurements(), null);
assert.equal(actor.system.identity.size, 72);
assert.equal(actor.system.identity.dominant, false);
const dominantActor = new LobiaActor({ identity: { nature: "", size: 0, weight: 0,
  averageSize: 60, averageWeight: 6, sizeRoll: 0, shinyRoll: 0 } });
await dominantActor.rollPokemonMeasurements();
assert.equal(dominantActor.system.identity.dominant, true);
assert.ok(messages.at(-1).flavor.includes("LOBIA.Pokemon.dominant"));
nextRoll = 1;
await actor.rollPokemonShiny();
assert.equal(actor.system.identity.shiny, true);
assert.equal(actor.system.identity.shinyRoll, 1);
nextRoll = 2;
assert.equal(await actor.rollPokemonShiny(), null);
assert.equal(actor.system.identity.shiny, true);
assert.equal(actor.system.identity.shinyRoll, 1);
assert.equal(await actor.rollPokemonNature(), null);
assert.equal(warnings, 3);
const simultaneous = new LobiaActor({ identity: { nature: "", sizeRoll: 0, shinyRoll: 0 } });
const messagesBefore = messages.length;
const simultaneousRolls = await Promise.all([simultaneous.rollPokemonShiny(), simultaneous.rollPokemonShiny()]);
assert.equal(simultaneousRolls.filter(Boolean).length, 1);
assert.equal(messages.length, messagesBefore + 1);
assert.equal(await actor._preUpdate({ "system.identity.shiny": false }, {}, game.user), false);
assert.equal(await actor._preUpdate({ "system.identity.weight": 2 }, {}, game.user), false);
assert.equal(await actor._preUpdate({ "system.identity.nature": "" }, {}, game.user), false);
assert.equal(await actor._preUpdate({ "system.identity.shiny": false }, { lobiaPokemonRoll: "shiny" }, game.user), false);
assert.equal(await new LobiaActor({ identity: { nature: "", sizeRoll: 0, shinyRoll: 0 } })
  ._preUpdate({ "system.identity.shiny": true }, { lobiaPokemonRoll: "shiny" }, game.user), true);
game.user.isGM = true;
await actor.update({ "system.identity.shiny": false, "system.identity.weight": 9 });
assert.equal(actor.system.identity.shiny, false);
assert.equal(actor.system.identity.weight, 9);
game.user.isGM = false;
const beforeTalentWarnings = warnings;
const talentActor = new LobiaActor({ identity: { nature: "" },
  talents: { first: "anti-bruit", second: "", third: "", selected: "" } });
assert.equal(await talentActor._preUpdate({ "system.talents.selected": "first" }, {}, game.user), true);
assert.equal(await talentActor._preUpdate({ "system.talents.selected": "third" }, {}, game.user), false);
assert.equal(await talentActor._preUpdate({ "system.talents.first": "autre" }, {}, game.user), false);
assert.equal(warnings, beforeTalentWarnings + 2);

const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const Handlebars = require("handlebars");
const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
Handlebars.registerHelper("localize", key => fr[key] ?? String(key));
Handlebars.registerHelper("checked", value => value ? "checked" : "");
Handlebars.registerHelper("selectOptions", () => new Handlebars.SafeString("<option>Test</option>"));
const output = Handlebars.compile(fs.readFileSync("templates/actor/pokemon-main.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "main" },
  actor: { name: "Lipoutti" },
  pokemonIdentity: { level: 1, nature: "brave", averageSize: 60, averageWeight: 6 },
  pokemonSexChoices: {}, natureChoices: {},
  talentOptions: [
    { slot: "first", slotLabel: "Talent 1", name: "Anti-bruit", selected: false },
    { slot: "second", slotLabel: "Talent 2", name: "Intimidation", selected: true },
    { slot: "third", slotLabel: "Talent 3", name: "Fuite", selected: false }
  ], selectedTalent: { name: "Intimidation", effect: "Baisse l'attaque." },
  canRollPokemonNature: true, canRollPokemonMeasurements: true, canRollPokemonShiny: true
});
assert.ok(output.trim().startsWith("<section") && output.trim().endsWith("</section>"));
for (const field of ["system.identity.nickname", "system.identity.sex",
  "system.talents.selected"]) {
  assert.ok(output.includes(`name="${field}"`), `Missing ${field}`);
}
assert.equal((output.match(/name="system.talents.selected"/g) ?? []).length, 3);
assert.ok(!output.includes('name="system.identity.level"'));
assert.ok(!output.includes('data-action="levelUp"'));
assert.ok(!output.includes('data-action="levelDown"'));
assert.equal((output.match(/type="radio"[^>]*checked/g) ?? []).length, 1);
for (const slot of ["first", "second", "third"]) assert.ok(output.includes(`value="${slot}"`));
assert.ok(output.includes("Baisse l&#x27;attaque."));
for (const field of ["first", "second", "third", "hidden"]) {
  assert.ok(!output.includes(`name="system.talents.${field}"`));
}
assert.ok(!output.includes("lobia-idvalue-select\" name=\"system.talents"));
assert.ok(output.includes("Lipoutti"));
assert.ok(!output.includes('name="name"'), "Principal must not submit a second actor name");
for (const field of ["system.identity.size", "system.identity.weight", "system.identity.nature",
  "system.identity.shiny", "system.identity.dominant"]) assert.ok(!output.includes(`name="${field}"`));
assert.ok(output.includes('data-action="rollNature"'));
assert.ok(output.includes('data-action="rollMeasurements"'));
assert.ok(output.includes('data-action="rollShiny"'));
assert.equal((output.match(/type="checkbox" disabled/g) ?? []).length, 2);
const gmOutput = Handlebars.compile(fs.readFileSync("templates/actor/pokemon-main.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "main" }, actor: { name: "Lipoutti" }, isGM: true,
  canLevelUp: true, canLevelDown: true, editPokemonTalents: true,
  talentSlots: [{ slot: "first", label: "Talent 1", selected: "anti-bruit" },
    { slot: "second", label: "Talent 2", selected: "" }, { slot: "third", label: "Talent 3", selected: "" }],
  talentChoices: { "anti-bruit": "Anti-bruit" },
  pokemonIdentity: { nickname: "Lili", level: 1, nature: "brave", averageSize: 60, averageWeight: 6 },
  pokemonSexChoices: {}, natureChoices: {}, talentOptions: []
});
for (const field of ["name", "system.identity.size", "system.identity.weight", "system.identity.nature",
  "system.identity.shiny", "system.identity.dominant"]) assert.ok(gmOutput.includes(`name="${field === "name" ? "system.species.name" : field}"`));
assert.ok(!gmOutput.includes('name="name"'));
for (const slot of ["first", "second", "third"]) assert.ok(gmOutput.includes(`name="system.talents.${slot}"`));
assert.ok(gmOutput.includes('data-action="levelUp"'));
assert.ok(gmOutput.includes('data-action="levelDown"'));
assert.ok(!gmOutput.includes('data-action="rollNature"'));
const headerTemplate = Handlebars.compile(fs.readFileSync("templates/actor/trainer-header.hbs", "utf8"));
const pokemonHeader = headerTemplate({ actor: { name: "Lipoutti", img: "" }, isPokemon: true,
  pokemonDisplayName: "Lili", battle: [], typeChoices: {} });
assert.ok(pokemonHeader.includes('<span class="lobia-hd-name">Lili</span>'));
assert.ok(!pokemonHeader.includes('name="name"'));
assert.ok(pokemonHeader.includes('name="system.combatStyle"'));
const trainerHeader = headerTemplate({ actor: { name: "Dresseur", img: "" }, isTrainer: true,
  battle: [], typeChoices: {} });
assert.ok(trainerHeader.includes('name="name"'));
assert.ok(trainerHeader.includes('name="system.combatStyle"'));
const templateOutput = Handlebars.compile(fs.readFileSync("templates/actor/pokemon-main.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "main" },
  actor: { name: "Férosinge" }, isPokemonTemplate: true, canEditSpeciesAverages: true,
  pokemonIdentity: { level: 1, averageSize: 50, averageWeight: 28 }, talentOptions: []
});
assert.ok(templateOutput.includes('name="system.identity.averageSize"'));
assert.ok(templateOutput.includes('name="system.identity.averageWeight"'));
assert.ok(!templateOutput.includes('data-action="rollMeasurements"'));
assert.ok(!templateOutput.includes('data-action="rollNature"'));
assert.ok(!templateOutput.includes('data-action="rollShiny"'));
assert.ok(!output.includes('name="system.identity.averageSize"'));
assert.ok(!output.includes('data-action="applyPokemonSpecies"'));
const statOutput = Handlebars.compile(fs.readFileSync("templates/actor/parts/stat-block.hbs", "utf8"))({
  statGroups: [[{
    key: "attaque", label: "Attaque", base: 65, mod: 0,
    effectiveBase: 75, natureClass: "has-bonus", baseTooltip: "Base 65 + nature 10",
    statTooltip: "Roll stat — Base 65 + nature 10",
    hasAutomaticBonus: true, total: 75, modClass: "zero"
  }]], statBaseTotal: 65
});
assert.ok(statOutput.includes("system.stats.attaque.mod"));
assert.ok(statOutput.includes('class="lobia-derived-base has-bonus"'));
assert.ok(statOutput.includes("Base 65 + nature 10"));
assert.ok(statOutput.includes('data-tooltip="Roll stat — Base 65 + nature 10"'));
assert.ok(!statOutput.includes('name="system.stats.attaque.base"'));
assert.ok(statOutput.includes('class="lobia-stat-total">75'));
console.log("Pokémon nature table, stat effects, measurements and Principal template: OK");
