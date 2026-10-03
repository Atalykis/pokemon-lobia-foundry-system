/** Workbook family topology, progression and numeric bonuses without a Foundry server. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const fields = {};
for (const name of ["NumberField", "StringField", "HTMLField", "ObjectField", "BooleanField", "SchemaField"]) {
  fields[name] = class { constructor(options = {}) { this.options = options; } };
}
globalThis.foundry = {
  abstract: { TypeDataModel: class { static migrateData(source) { return source; } } }, data: { fields },
  applications: { api: { DialogV2: { confirm: async () => true } } }
};
globalThis.ui = { notifications: { warn: () => { throw Error("unexpected warning"); } } };
globalThis.game = { i18n: { localize: key => key } };
globalThis.Actor = class { async _preUpdate() { return true; } };
const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
const { default: ActorDocument } = await import("../../module/documents/actor.mjs");
const { pokemonTreeProfile, pokemonNodeOpen, pokemonTreeLabel, pokemonTreeBonus, POKEMON_TREE_ROWS } = await import("../../module/data/pokemon-tree.mjs");
const { pokemonMove } = await import("../../module/data/pokemon-moves.mjs");
const { POKEDEX_FAMILIES } = await import("../../module/data/pokemon-pokedex.mjs");
const { pokemonSpecies, pokemonTemplateUpdates } = await import("../../module/data/pokemon-species.mjs");
const { POKEMON_DOMINANT_TREES } = await import("../../module/data/pokemon-dominant-data.mjs");
const { setDominantTrees, resetDominantTrees } = await import("../../module/data/dominant-tree-registry.mjs");

assert.equal(Object.keys(POKEMON_DOMINANT_TREES).length, 18);
for (const tree of Object.values(POKEMON_DOMINANT_TREES)) {
  assert.deepEqual(Object.keys(tree.labels), ["root", "a1", "b1", "mid1", "a2", "b2", "mid2", "a3", "b3", "end"]);
  assert.match(tree.notes.end, /-10 Général/);
}
assert.equal(POKEMON_DOMINANT_TREES.electrik.labels.root, "Monte-tension");
assert.match(POKEMON_DOMINANT_TREES.feu.notes.root, /1D8 Dégâts/);

assert.equal(POKEMON_TREE_ROWS.length, 7);
const corayonArmor = pokemonTreeProfile("Corayon").branches.find(branch => branch.id === "corayon-3");
assert.equal(pokemonMove(corayonArmor.labels.root)?.name, "Armure");
assert.equal(pokemonTreeBonus(corayonArmor.labels.root), null);
assert.equal(pokemonMove(corayonArmor.labels.a3), null);
assert.deepEqual(pokemonTreeBonus(corayonArmor.labels.a3), { derived: "armure", amount: 1 });
for (const family of Object.values(POKEDEX_FAMILIES)) {
  for (const branch of family.branches) {
    for (const label of Object.values(branch.labels)) {
      if (pokemonTreeBonus(label)) assert.equal(pokemonMove(label), null, `${branch.id}: ${label} is a bonus, not a move`);
    }
  }
}
assert.deepEqual(pokemonTreeProfile("Férosinge").branches.map(b => b.labels.root),
  ["Griffe", "Frénésie", "Implore", "Jab"]);
assert.equal(pokemonTreeProfile("Colossinge").stage, 1);
assert.equal(pokemonTreeProfile("Courrousinge").stage, 2);
assert.equal(pokemonTreeProfile("Pikachu").branches.length, 4);
assert.deepEqual(pokemonTreeProfile("Debugant").branches.map(branch => branch.id),
  ["debugant-1", "debugant-2"]);
for (const [name, own] of [["Kicklee", "kicklee"], ["Tygnon", "tygnon"], ["Kapoera", "kapoera"]]) {
  const branches = pokemonTreeProfile(name).branches.map(branch => branch.id);
  assert.deepEqual(branches, ["debugant-1", "debugant-2", `${own}-1`, `${own}-2`]);
}
assert.deepEqual(pokemonTreeProfile("Evoli").branches.map(branch => branch.id),
  ["evoli-1", "evoli-2", "evoli-3"]);
assert.deepEqual(pokemonTreeProfile("Aquali").branches.map(branch => branch.id),
  ["evoli-1", "evoli-2", "evoli-3", "aquali"]);
assert.deepEqual(pokemonTreeProfile("Métamorph").branches.map(branch => branch.labels.root),
  ["Morphing", "Morphing", "Morphing", "Morphing"]);
assert.equal(pokemonTreeProfile("Lokhlass").branches.length, 4);
const mystherbeBranches = ["mystherbe", "ortide", "rafflesia", "joliflor"];
for (const name of ["Mystherbe", "Ortide", "Rafflesia", "Joliflor"]) {
  assert.deepEqual(pokemonTreeProfile(name).branches.map(branch => branch.id), mystherbeBranches);
}
assert.deepEqual(pokemonTreeProfile("Tarpaud").branches.map(branch => branch.id),
  ["ptitard", "tetarte", "tartard-1", "tarpaud"]);
assert.deepEqual(pokemonTreeProfile("Férosinge").branches.map(branch => branch.id),
  ["ferosinge-1", "ferosinge-2", "colossinge", "courrousinge"]);
const ferosingeTree = pokemonTreeProfile("Férosinge");
const secondTree = ferosingeTree.branches[1];
assert.equal(pokemonNodeOpen(ferosingeTree, secondTree, "a2", 4), true); // no restriction in Kanto
assert.equal(pokemonNodeOpen(ferosingeTree, secondTree, "mid2", 4), false); // Colossinge required
assert.equal(pokemonNodeOpen(pokemonTreeProfile("Colossinge"), secondTree, "mid2", 4), true);
assert.equal(pokemonNodeOpen(pokemonTreeProfile("Colossinge"), secondTree, "end", 4), false);
assert.equal(pokemonNodeOpen(pokemonTreeProfile("Courrousinge"), secondTree, "end", 4), true);
const evoli = pokemonTreeProfile("Evoli");
const aqualiBranch = pokemonTreeProfile("Aquali").branches.find(branch => branch.species === "Aquali");
assert.equal(pokemonNodeOpen(evoli, aqualiBranch, "root", 20), false);
assert.equal(pokemonNodeOpen(pokemonTreeProfile("Aquali"), aqualiBranch, "root", 20), true);
assert.equal(pokemonNodeOpen(pokemonTreeProfile("Voltali"), aqualiBranch, "root", 20), false);
const joliflor = pokemonTreeProfile("Joliflor");
const joliflorBranch = joliflor.branches.find(branch => branch.species === "Joliflor");
assert.equal(pokemonNodeOpen(joliflor, joliflorBranch, "a3", 20), true);
assert.equal(pokemonTreeLabel(joliflor, joliflorBranch, "a3"), "Papillodanse");
const mystherbe = pokemonTreeProfile("Mystherbe");
assert.equal(pokemonTreeLabel(mystherbe, joliflorBranch, "a3"), "Aromathérapie");
assert.equal(pokemonNodeOpen(mystherbe, joliflorBranch, "root", 3), false); // level remark
assert.equal(pokemonNodeOpen(mystherbe, joliflorBranch, "root", 4), true);
const customOwner = { parent: { name: "Flami" }, species: { name: "Flami" },
  customPokemonBranches: { "custom-abc": { title: "Métamorphose",
    conditionType: "level", conditionLevel: 8, labels: { root: "Départ" } } },
  identity: { level: 7 }, pokemonTrees: {}, pokemonTreePointsRemaining: 3 };
const profileFor = () => Object.getOwnPropertyDescriptor(Pokemon.prototype, "treeProfile").get.call(customOwner);
let customProfile = profileFor();
let customBranch = customProfile.branches.find(branch => branch.id === "custom-abc");
assert.equal(pokemonNodeOpen(customProfile, customBranch, "root", 7), false);
assert.equal(Pokemon.prototype.isPokemonNodeAvailable.call({ ...customOwner, treeProfile: customProfile }, "custom-abc", "root"), false);
customOwner.identity.level = 8;
assert.equal(Pokemon.prototype.isPokemonNodeAvailable.call({ ...customOwner, treeProfile: customProfile }, "custom-abc", "root"), true);
customOwner.customPokemonBranches["custom-abc"].conditionType = "evolution";
customOwner.customPokemonBranches["custom-abc"].conditionSpecies = "Flamion";
customProfile = profileFor();
customBranch = customProfile.branches.find(branch => branch.id === "custom-abc");
assert.equal(pokemonNodeOpen(customProfile, customBranch, "root", 20), false);
customOwner.species.name = "Flamion";
customProfile = profileFor();
customBranch = customProfile.branches.find(branch => branch.id === "custom-abc");
assert.equal(pokemonNodeOpen(customProfile, customBranch, "root", 8), true);
customOwner.species.name = "Flami";
customOwner.customPokemonBranches["custom-abc"].conditionSpecies = "";
customProfile = profileFor();
assert.equal(pokemonNodeOpen(customProfile, customProfile.branches.find(branch => branch.custom), "root", 8), false);
const roigada = pokemonTreeProfile("Roigada");
const roigadaBranch = roigada.branches.find(branch => branch.species === "Roigada");
assert.equal(pokemonNodeOpen(roigada, roigadaBranch, "a1", 20), true);
assert.equal(pokemonTreeLabel(roigada, roigadaBranch, "a1"), "Rayon gemme");
const legacy = Pokemon.migrateData({ pokemonTrees: { "ferosinge-1": { a1: true } } });
assert.equal(legacy.pokemonTrees["ferosinge-1"].root, true);
const ferosinge = pokemonSpecies("Férosinge");
assert.deepEqual([ferosinge.averageSize, ferosinge.averageWeight, ferosinge.battle.deplacement], [50, 28, 5]);
assert.deepEqual(ferosinge.talents, ["esprit-vital", "colerique", "acharne"]);
assert.equal(pokemonSpecies("Courrousinge").types[1], "spectre");
assert.equal(pokemonSpecies("Colossinge").talents[1], "colerique");

const first = pokemonTemplateUpdates(ferosinge);
assert.equal(first["system.identity.averageSize"], 50);
assert.equal(first["system.battle.deplacement.max"], 5);
assert.equal(first["system.battle.deplacement.value"], 5);
assert.equal(first["system.stats.attaque.base"], 75);
assert.equal(first["system.talents.first"], "esprit-vital");
assert.equal(first["system.talents.third"], "acharne");
assert.equal(first["system.identity.size"], 0);
assert.equal(first["system.identity.nature"], "");
assert.equal(first["system.identity.shiny"], false);
assert.equal(first["system.hp.base"], 10);
assert.equal(first["system.identity.level"], 0);
assert.equal(first["system.species.hpFormula"], "2d4");
assert.equal(Pokemon.migrateData({ species: { hpFormula: "12 + Niv(3D4)" }, hp: { base: 12 } }).species.hpFormula, "3d4");
assert.equal(Pokemon.migrateData({ species: { hpFormula: "12" }, hp: { base: 12 } }).species.hpFormula, "");
const evolved = pokemonTemplateUpdates(pokemonSpecies("Courrousinge"));
assert.equal(evolved["system.identity.averageSize"], 120);
assert.equal(evolved["system.identity.averageWeight"], 56);
assert.equal(evolved["system.type.secondary"], "spectre");
assert.equal(evolved["system.stats.attaque.base"], 85);
assert.equal(evolved["system.battle.deplacement.max"], 4);
assert.equal(evolved["system.battle.deplacement.value"], 4);
const divighost = pokemonSpecies("Divighost");
assert.deepEqual(divighost.types, ["combat", "spectre"]);
assert.equal(divighost.division.size, 5);
assert.equal(Object.keys(divighost.division.roles).length, 10);
assert.equal(pokemonTreeProfile("Divighost").branches.length, 10);
assert.equal(divighost.division.roles["divighost-9"].name, "Soldat");
assert.deepEqual(divighost.division.roles["divighost-4"].stats,
  { attaque: 5, defense: -5, attaqueSpeciale: 5, defenseSpeciale: -5 });
assert.equal(evolved["system.talents.second"], "attention");

class Model extends Pokemon {
  constructor(name, trees = {}) {
    super();
    this.parent = { name };
    this.identity = { level: 12, nature: "" };
    this.type = { primary: "combat", secondary: "spectre" };
    this.dominantType = "";
    this.pokemonTrees = trees;
    this.hp = { value: 10, base: 10 };
    this.stats = Object.fromEntries(["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"]
      .map(key => [key, { base: 50, mod: 0 }]));
    this.derivedMods = { armure: 0, barriere: 0, physique: 0, special: 0, initiative: 0 };
    this.battle = Object.fromEntries(["deplacement", "action", "actionBonus", "reaction"]
      .map(key => [key, { value: 1, max: 1 }]));
  }
}
const model = new Model("Férosinge", {
  "ferosinge-1": { root: true, a1: true, mid1: true, a2: true, mid2: true, a3: true, b3: true },
  "ferosinge-2": { root: true, a1: true, b1: true, a3: true },
  colossinge: { root: true, a2: true }
});
const nicknamed = new Model("Singe");
nicknamed.species = { name: "Férosinge" };
assert.deepEqual(nicknamed.treeProfile.branches.map(branch => branch.id),
  pokemonTreeProfile("Férosinge").branches.map(branch => branch.id));
const division = new Model("Divighost");
division.species = { name: "Divighost", hpFormula: "3d4" };
for (const stat of Object.values(division.stats)) stat.base = 45;
division.identity.level = 3;
division.divisionMembers = { member1: "divighost-4", member2: "divighost-4",
  member3: "divighost-9", member4: "divighost-1", member5: "divighost-8" };
assert.deepEqual(division.treeProfile.branches.map(branch => branch.id),
  ["divighost-member1", "divighost-member2", "divighost-member3", "divighost-member4", "divighost-member5"]);
assert.equal(division.isPokemonNodeAvailable("divighost-member1", "root"), true);
assert.equal(division.isPokemonNodeAvailable("divighost-member2", "root"), true);
assert.equal(division.isPokemonNodeAvailable("divighost-2", "root"), false);
division.prepareDerivedData();
assert.equal(division.stats.attaque.total, 55);
assert.equal(division.stats.attaqueSpeciale.total, 65);
assert.equal(division.stats.defense.total, 25);
assert.equal(division.derived.physique.base, 5);
division.identity.level = 5;
division.prepareDerivedData();
assert.equal(division.stats.attaque.total, 60);
division.identity.level = 10;
division.prepareDerivedData();
assert.equal(division.stats.attaque.total, 65);
division.pokemonTrees = { "divighost-member1": { root: true, b1: true } };
division.prepareDerivedData();
assert.equal(division.derived.special.bonus, 2);
assert.equal(division.isPokemonNodeAvailable("divighost-member2", "root"), true);
model.identity.level = 20;
assert.equal(model.pokemonTreePointsSpent, 13);
assert.equal(model.pokemonTreePointsRemaining, 7);
assert.equal(model.isPokemonNodeAvailable("colossinge", "a1"), true); // paid root already acquired
assert.equal(model.isPokemonNodeAvailable("courrousinge", "root"), true); // no comment restricts this branch
assert.equal(model.isPokemonNodeAvailable("courrousinge", "a1"), false); // must buy its root
assert.equal(model.isPokemonNodeAvailable("ferosinge-2", "mid2"), false); // Colossinge required
model.identity.level = 3;
assert.equal(model.isPokemonNodeAvailable("colossinge", "a1"), false);
assert.equal(model.isPokemonNodeAvailable("courrousinge", "a1"), false); // no points left
model.identity.level = 20;
assert.equal(model.isPokemonNodeAvailable("ferosinge-1", "end"), true);
model.prepareDerivedData();
assert.equal(model.derived.physique.bonus, 4);
assert.equal(model.derived.initiative.bonus, 2);
assert.equal(model.battle.actionBonus.total, 3); // first and early Colossinge branches
assert.equal(model.battle.deplacement.total, 2);
assert.equal(model.derived.barriere.bonus, 0); // future evolution not yet active
const fresh = new Model("Férosinge");
fresh.identity.level = 3;
assert.equal(fresh.isPokemonNodeAvailable("courrousinge", "root"), true);
assert.equal(fresh.isPokemonNodeAvailable("courrousinge", "a1"), false);
assert.equal(fresh.isPokemonNodeAvailable("ferosinge-2", "root"), false); // level 4 remark
fresh.identity.level = 4;
assert.equal(fresh.isPokemonNodeAvailable("ferosinge-2", "root"), true);
const debugant = new Model("Debugant");
assert.equal(debugant.isPokemonNodeAvailable("debugant-1", "root"), true);
assert.equal(debugant.isPokemonNodeAvailable("kicklee-1", "root"), false);
debugant.parent.name = "Tygnon";
assert.equal(debugant.isPokemonNodeAvailable("tygnon-1", "root"), true);
assert.equal(debugant.isPokemonNodeAvailable("kicklee-1", "root"), false);
model.parent.name = "Colossinge";
model.prepareDerivedData();
assert.equal(model.battle.action.total, 3); // Kanto sheet restricts branch 2's end, not Action +
assert.equal(model.isPokemonNodeAvailable("ferosinge-2", "mid2"), false); // missing a2/b2 prerequisite
model.parent.name = "Courrousinge";
model.prepareDerivedData();
assert.equal(model.battle.action.total, 3);
model.parent.name = "Férosinge";

const doc = new ActorDocument();
doc.type = "pokemon";
doc.system = model;
doc.update = async updates => {
  for (const [path, value] of Object.entries(updates)) {
    const [branch, id] = path.replace("system.pokemonTrees.", "").split(".");
    if (id.startsWith("-=")) delete model.pokemonTrees[branch][id.slice(2)];
    else (model.pokemonTrees[branch] ??= {})[id] = value;
  }
  return updates;
};
await doc.lockPokemonNode("ferosinge-1", "a1");
assert.equal(model.pokemonTrees["ferosinge-1"].mid1, undefined);
assert.equal(model.pokemonTrees["ferosinge-1"].a3, undefined);
assert.equal(model.pokemonTrees["ferosinge-1"].root, true);
await doc.unlockPokemonNode("ferosinge-1", "b1");
assert.equal(model.pokemonTrees["ferosinge-1"].b1, true);
await doc.lockPokemonNode("ferosinge-1", "root");
assert.equal(model.pokemonTrees["ferosinge-1"].b1, undefined);
assert.equal(model.pokemonTrees["ferosinge-1"].root, undefined);
assert.equal(model.isPokemonNodeAvailable("ferosinge-1", "a1"), false);
await doc.unlockPokemonNode("ferosinge-1", "root");
assert.equal(model.pokemonTrees["ferosinge-1"].root, true);
assert.equal(model.pokemonTreePointsSpent, 7);

// An unlisted Pokémon starts with placeholders, then uses its own editable branches.
const custom = new Model("Inédit");
assert.equal(custom.treeProfile.branches[0].id, "placeholder-1");
custom.customPokemonBranches = { "custom-abc123": { title: "Départ", labels: { root: "Physique +", a1: "Action +" } } };
assert.deepEqual(custom.treeProfile.branches.map(branch => branch.id), ["custom-abc123"]);
assert.equal(custom.isPokemonNodeAvailable("custom-abc123", "root"), true);
assert.equal(custom.isPokemonNodeAvailable("custom-abc123", "b1"), false); // empty cells cannot be bought
custom.pokemonTrees = { "custom-abc123": { root: true, a1: true } };
custom.prepareDerivedData();
assert.equal(custom.derived.physique.bonus, 2);
assert.equal(custom.battle.action.total, 2);
assert.equal(custom.pokemonTreePointsSpent, 2);
assert.equal(custom.isPokemonNodeAvailable("custom-abc123", "a1"), false);
const knownCustom = new Model("Férosinge");
knownCustom.customPokemonBranches = custom.customPokemonBranches;
assert.equal(knownCustom.treeProfile.branches.length, 5); // bundled branches are preserved

const dominant = new Model("Férosinge");
assert.equal(dominant.treeProfile.branches.length, 4);
dominant.identity.dominant = true;
assert.equal(dominant.treeProfile.branches.length, 4); // two types: player chooses
dominant.dominantType = "combat";
assert.equal(dominant.treeProfile.branches.length, 5);
assert.equal(dominant.treeProfile.branches[4].labels.root, "Aura guerrière");
assert.equal(dominant.isPokemonNodeAvailable("dominant-combat", "root"), true);
dominant.pokemonTrees = { "dominant-combat": { root: true, a1: true, a2: true } };
dominant.prepareDerivedData();
assert.equal(dominant.derived.physique.bonus, 2);
assert.equal(dominant.battle.reaction.total, 2);
assert.equal(dominant.pokemonTreePointsSpent, 3);
dominant.dominantType = "spectre";
assert.equal(dominant.isPokemonNodeAvailable("dominant-spectre", "root"), false);
dominant.dominantType = "combat";
dominant.type.secondary = "";
assert.equal(dominant.dominantTreeType, "combat");
dominant.identity.dominant = false;
assert.equal(dominant.treeProfile.branches.length, 4);
const singleType = new Model("Pikachu");
singleType.type = { primary: "electrik", secondary: "" };
singleType.identity.dominant = true;
assert.equal(singleType.treeProfile.branches[4].id, "dominant-electrik");
assert.equal(singleType.treeProfile.branches[4].labels.root, "Monte-tension");
setDominantTrees([{ system: { type: "electrik", labels: {
  ...POKEMON_DOMINANT_TREES.electrik.labels, a1: "Armure +"
}, notes: { ...POKEMON_DOMINANT_TREES.electrik.notes, root: "Note MJ" } } }]);
assert.equal(singleType.treeProfile.branches[4].notes.root, "Note MJ");
singleType.pokemonTrees = { "dominant-electrik": { root: true, a1: true } };
singleType.prepareDerivedData();
assert.equal(singleType.derived.armure.bonus, 1);
assert.equal(singleType.derived.special.bonus, 0);
singleType.type.primary = "feu";
assert.equal(singleType.treeProfile.branches.length, 4, "deleted pack entry has no per-type fallback");
resetDominantTrees();

game.user = { isGM: true };
foundry.utils = { randomID: () => "new123" };
foundry.utils.flattenObject = value => value;
ui.notifications.warn = () => {};
const divisionDoc = new ActorDocument();
divisionDoc.type = "pokemon";
divisionDoc.system = division;
assert.equal(await divisionDoc._preUpdate({ "system.divisionMembers.member1": "divighost-2",
  "system.divisionMembers.member2": "divighost-2" }, {}, game.user), false);
assert.equal(await divisionDoc._preUpdate({ "system.divisionMembers.member1": "divighost-2" }, {}, game.user), false);
assert.equal(await divisionDoc._preUpdate({ "system.divisionMembers.member2": "divighost-2" }, {}, game.user), true);
division.pokemonTrees["divighost-member2"] = { root: true, b1: true };
division.prepareDerivedData();
assert.equal(division.derived.special.bonus, 4);
assert.equal(await divisionDoc._preUpdate({ "system.divisionMembers.member2": "divighost-2" }, {}, game.user), false);
assert.equal(await divisionDoc._preUpdate({ "system.divisionMembers.member1": "invalid" }, {}, game.user), false);
assert.equal(await divisionDoc._preUpdate({ "system.divisionMembers.member1": "divighost-4" }, {}, game.user), true);
const dominantDoc = new ActorDocument();
dominantDoc.type = "pokemon";
dominantDoc.system = dominant;
dominant.identity.dominant = true;
dominant.type.secondary = "spectre";
assert.equal(await dominantDoc._preUpdate({ "system.dominantType": "spectre" }, {}, game.user), false);
assert.equal(await dominantDoc._preUpdate({ "system.identity.dominant": false }, {}, game.user), false);
assert.equal(await dominantDoc._preUpdate({ "system.type.primary": "feu" }, {}, game.user), false);
dominant.pokemonTrees = {};
assert.equal(await dominantDoc._preUpdate({ "system.dominantType": "spectre" }, {}, game.user), true);
assert.equal(await dominantDoc._preUpdate({ "system.dominantType": "feu" }, {}, game.user), false);
dominant.dominantType = "spectre";
assert.equal(dominant.treeProfile.branches[4].labels.root, "Nécropolis");
const customDoc = new ActorDocument();
customDoc.type = "pokemon";
customDoc.system = custom;
customDoc.system.hp.value = 17;
customDoc.system.pokemonTreeRolls = { "custom-abc123-root": 7, "other-root": 3 };
customDoc.system.pokemonTreeHpHistory = { "custom-abc123-root": 7, "other-root": 3 };
customDoc.update = async update => {
  for (const [path, value] of Object.entries(update)) {
    if (path === "system.hp.value") custom.hp.value = value;
    else if (path.startsWith("system.customPokemonBranches.-=")) delete custom.customPokemonBranches[path.split("-=")[1]];
    else if (path.startsWith("system.customPokemonBranches.")) custom.customPokemonBranches[path.split(".").at(-1)] = value;
    else if (path.startsWith("system.pokemonTrees.-=")) delete custom.pokemonTrees[path.split("-=")[1]];
    else if (path.startsWith("system.pokemonTreeRolls.-=")) delete custom.pokemonTreeRolls[path.split("-=")[1]];
    else if (path.startsWith("system.pokemonTreeHpHistory.-=")) delete custom.pokemonTreeHpHistory[path.split("-=")[1]];
  }
  return update;
};
const pack = { locked: true };
game.packs = new Map([["lobia.pokemons", pack]]);
customDoc.pack = "lobia.pokemons";
assert.equal(await customDoc.addPokemonBranch(), undefined); // locked packs cannot be edited directly
pack.locked = false;
await customDoc.addPokemonBranch();
assert.ok(custom.customPokemonBranches["custom-new123"]);
await customDoc.deletePokemonBranch("custom-abc123");
assert.equal(custom.customPokemonBranches["custom-abc123"], undefined);
assert.equal(custom.pokemonTrees["custom-abc123"], undefined);
assert.equal(custom.hp.value, 10);
assert.equal(custom.pokemonTreeRolls["other-root"], 3);
assert.deepEqual(custom.pokemonTreeHpHistory, { "other-root": 3 });

const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const handlebars = require("handlebars");
const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
handlebars.registerHelper("localize", key => fr[key] ?? key);
handlebars.registerHelper("selectOptions", (options, { hash }) =>
  new handlebars.SafeString(Object.entries(options ?? {}).map(([key, name]) =>
    `<option value="${key}"${hash.selected === key ? " selected" : ""}>${name}</option>`).join("")));
const template = handlebars.compile(fs.readFileSync("templates/actor/pokemon-tree.hbs", "utf8"));
const html = template({ tab: { id: "tree", group: "sheet", active: true },
  pokemonTreePoints: { total: 10, spent: 1, remaining: 9 },
  pokemonBranches: pokemonTreeProfile("Férosinge").branches.map(branch => ({
    rows: POKEMON_TREE_ROWS.map(row => row.map(id => ({
      id, branch: branch.id, label: branch.labels[id], status: "locked"
    })))
  })) });
assert.match(html.trim(), /^<section[\s\S]*<\/section>$/);
assert.equal((html.match(/class="lobia-tree(?: lobia-tree-future)?"/g) ?? []).length, 4);
assert.equal((html.match(/class="lobia-node /g) ?? []).length, 40);
assert.ok(!/<h3[^>]*>.*(?:Férosinge|Colossinge|Courrousinge)/.test(html));
const dominantHtml = template({ tab: { id: "tree", group: "sheet", active: true },
  dominantTypeChoices: [
    { key: "combat", name: "Combat", selected: true }, { key: "spectre", name: "Spectre" }
  ], pokemonTreePoints: { total: 12, spent: 0, remaining: 12 },
  pokemonBranches: pokemonTreeProfile("Férosinge").branches.concat(dominant.treeProfile.branches[4])
    .map(branch => ({ dominant: Boolean(branch.dominant), dominantName: "Spectre",
      rows: POKEMON_TREE_ROWS.map(row => row.map(id => ({ id, branch: branch.id,
        label: branch.labels[id], status: "locked" }))) })) });
assert.match(dominantHtml, /name="system.dominantType"/);
assert.match(dominantHtml, /Dominant — Spectre/);
assert.equal((dominantHtml.match(/class="lobia-node /g) ?? []).length, 50);
const customHtml = template({ tab: { id: "tree", group: "sheet", active: true },
  canEditPokemonBranches: true, editPokemonBranches: true,
  pokemonTreePoints: { total: 12, spent: 0, remaining: 12 },
  pokemonBranches: [{ id: "custom-new123", custom: true, title: "Départ",
    conditionIsLevel: true, conditionLevel: 8,
    rows: POKEMON_TREE_ROWS.map(row => row.map(id => ({ id, branch: "custom-new123", rawLabel: "", label: "—" }))) }] });
assert.match(customHtml, /name="system.customPokemonBranches.custom-new123.labels.root"/);
assert.match(customHtml, /name="system.customPokemonBranches.custom-new123.conditionType"/);
assert.match(customHtml, /name="system.customPokemonBranches.custom-new123.conditionLevel" value="8"/);
assert.match(customHtml, /data-action="deletePokemonBranch"/);
const visibleCustomHtml = template({ tab: { id: "tree", group: "sheet", active: true },
  pokemonBranches: [{ id: "custom-new123", custom: true, title: "Départ", rows: [] }] });
assert.ok(!visibleCustomHtml.includes("Départ"));
assert.ok(!visibleCustomHtml.includes("lobia-custom-tree-heading"));
const evolutionHtml = template({ tab: { id: "tree", group: "sheet", active: true }, editPokemonBranches: true,
  pokemonBranches: [{ id: "custom-new123", custom: true, conditionIsEvolution: true,
    conditionSpecies: "Flamion", rows: [] }] });
assert.match(evolutionHtml, /name="system.customPokemonBranches.custom-new123.conditionSpecies" value="Flamion"/);
const divisionHtml = template({ tab: { id: "tree", group: "sheet", active: true },
  divisionRoleChoices: Object.fromEntries(Object.entries(divighost.division.roles).map(([key, role]) => [key, role.name])),
  divisionMembers: [1, 2, 3, 4, 5].map(number => ({ number, slot: `member${number}` })),
  pokemonBranches: division.treeProfile.branches.map(branch => ({ title: branch.title,
    divisionRole: true, rows: [] })) });
assert.equal((divisionHtml.match(/name="system.divisionMembers.member\d"/g) ?? []).length, 5);
assert.match(divisionHtml, /Capitaine/);
console.log("Pokédex family trees, comment gates, progression, bonuses and template: OK");
