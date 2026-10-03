/** Seed existing templates and create missing LG actors in batches, restoring the pack lock. */
import assert from "node:assert/strict";
import { setupPokemonTemplates } from "../../module/packs/pokemon-template-pack.mjs";
import { POKEDEX_SPECIES, POKEDEX_FAMILIES, LOBIA_POKEDEX_SPECIES } from "../../module/data/pokemon-pokedex.mjs";
import { pokemonSpecies } from "../../module/data/pokemon-species.mjs";

const changed = [];
assert.equal(Object.keys(POKEDEX_SPECIES).length, 1272);
assert.equal(Object.keys(POKEDEX_FAMILIES).length, 621);
assert.equal(Object.values(POKEDEX_FAMILIES).reduce((sum, family) => sum + family.branches.length, 0), 2544);
assert.equal(Object.keys(LOBIA_POKEDEX_SPECIES).length, 230);
const lobiaName = Object.values(LOBIA_POKEDEX_SPECIES)[0].name;
const noPortraitName = Object.values(LOBIA_POKEDEX_SPECIES).find(species => !species.image).name;
const typeName = type => ({ electrik: "Electrique", fee: "Fée", tenebres: "Ténèbres" })[type]
  ?? `${type[0].toUpperCase()}${type.slice(1)}`;
const folderByType = new Map();
const folders = [];
for (const type of new Set(Object.values(LOBIA_POKEDEX_SPECIES).map(species => species.types[0]))) {
  const root = { id: `root-${type}`, name: typeName(type), folder: null, getFlag: () => null };
  const lg = { id: `lg-${type}`, name: "LG", folder: root, getFlag: () => null };
  folderByType.set(type, lg);
  folders.push(root, lg);
}
const accidentalRoot = { id: "accidental-lg", name: "LG", folder: null,
  getFlag: (scope, key) => key === "key" ? "lg" : null };
folders.push(accidentalRoot);
const names = [...Object.values(POKEDEX_SPECIES).slice(0, 1041).map(species => species.name),
  lobiaName, noPortraitName, "Unlisted Pokémon"];
const actors = names.map((name, index) => ({
  name, type: "pokemon", id: String(index), version: index === 0 ? 3 : index < 1041 ? 5 : 0,
  folder: index === 1041 || index === 1042 ? accidentalRoot : null,
  system: { identity: { level: 1 }, pokemonTrees: index === 0 ? { "ferosinge-1": { a1: true } } : {},
    pokemonTreeRolls: index === 0 ? { "ferosinge-1-b3": 6 } : {} },
  getFlag(scope, key) { return key === "lgArtworkVersion" ? this.artworkVersion ?? 0
    : key === "levelZeroVersion" ? this.levelZeroVersion ?? 0 : this.version; }
}));
actors[1]._source = { system: { species: { hpFormula: "12 + Niv(3D4)" } } };
actors[0].system.identity.nickname = "Monkey";
actors[0].system.accelerators = { old: { name: "PV Plus", hp: 5 } };
actors[10].system.accelerators = { old: { name: "PV Plus", hp: 5 } };
actors[10].system.hp = { base: 15, value: 12 };
const pack = {
  locked: true, collection: "lobia.pokemons", locks: [],
  folders,
  async getDocuments() { return actors; },
  async configure({ locked }) { this.locked = locked; this.locks.push(locked); }
};
const batches = [];
let createdCount = 0;
let removedAccidental = false;
globalThis.Folder = { implementation: { async deleteDocuments(ids, { pack: collection }) {
  assert.equal(collection, pack.collection);
  assert.deepEqual(ids, [accidentalRoot.id]);
  assert.ok(!actors.some(actor => actor.folder?.id === accidentalRoot.id));
  removedAccidental = true;
  pack.folders.splice(pack.folders.indexOf(accidentalRoot), 1);
} } };
globalThis.Actor = { implementation: { async createDocuments(data, { pack: collection }) {
  assert.equal(collection, pack.collection);
  assert.equal(pack.locked, false);
  assert.ok(data.length <= 100 && data.every(actor =>
     actor.folder === folderByType.get(actor.name === "Divighost" ? "spectre" : pokemonSpecies(actor.name).types[0]).id));
  createdCount += data.length;
const created = data.map(({ name, folder, system }) => ({ name, type: "pokemon", id: `new-${name}`,
    version: 0, folder: { id: folder }, system: { identity: { level: 1, ...system.identity },
      species: system.species, pokemonTrees: {} },
    getFlag(scope, key) { return key === "lgArtworkVersion" ? this.artworkVersion ?? 0
      : key === "levelZeroVersion" ? this.levelZeroVersion ?? 0 : this.version; } }));
  actors.push(...created);
  return created;
}, async updateDocuments(updates, { pack: collection, lobiaPokemonTemplateMigration }) {
  assert.equal(collection, pack.collection);
  assert.equal(lobiaPokemonTemplateMigration, true);
  assert.ok(updates.length <= 10);
  batches.push(updates.length);
  for (const data of updates) {
    const actor = actors.find(actor => actor.id === data._id);
    changed.push([actor.name, data]);
    if (data["flags.lobia.speciesTemplateVersion"]) actor.version = data["flags.lobia.speciesTemplateVersion"];
    if (data["flags.lobia.levelZeroVersion"]) actor.levelZeroVersion = data["flags.lobia.levelZeroVersion"];
    if (data["system.identity.level"] !== undefined) actor.system.identity.level = data["system.identity.level"];
    if (data["system.identity.nickname"] !== undefined) actor.system.identity.nickname = data["system.identity.nickname"];
    if (data["system.species.name"] !== undefined) (actor.system.species ??= {}).name = data["system.species.name"];
    if (data["system.hp.base"] !== undefined) (actor.system.hp ??= {}).base = data["system.hp.base"];
    if (data["system.hp.value"] !== undefined) (actor.system.hp ??= {}).value = data["system.hp.value"];
    for (const key of Object.keys(data).filter(key => key.startsWith("system.accelerators.-="))) {
      delete actor.system.accelerators[key.slice("system.accelerators.-=".length)];
    }
    if (data.name !== undefined) actor.name = data.name;
    if (data["flags.lobia.lgArtworkVersion"]) actor.artworkVersion = data["flags.lobia.lgArtworkVersion"];
    if (data.folder) actor.folder = { id: data.folder };
    if (data["system.species.hpFormula"] && actor._source?.system?.species) {
      actor._source.system.species.hpFormula = data["system.species.hpFormula"];
    }
  }
  return updates.map(data => actors.find(actor => actor.id === data._id));
} } };
globalThis.game = { user: { isGM: true }, packs: { get: id => id === "lobia.pokemons" ? pack : null },
  i18n: { format: key => key } };
globalThis.ui = { notifications: { error: error => { throw Error(error); } } };
await setupPokemonTemplates();
assert.equal(createdCount, 229);
assert.equal(actors[0].name, "Monkey");
assert.equal(actors[0].system.species.name, names[0]);
assert.deepEqual(actors[0].system.accelerators, {});
assert.deepEqual(actors[10].system.accelerators, {});
assert.deepEqual(actors[10].system.hp, { base: 10, value: 7 });
const firstUpdates = changed.length;
assert.ok(firstUpdates > 1272);
assert.equal(actors.find(actor => actor.name === "Divighost").folder.id, "lg-spectre");
assert.equal(changed.find(([name, data]) => name === "Divighost" && data["flags.lobia.speciesTemplateVersion"])[1]["flags.lobia.speciesTemplateVersion"], 7);
assert.equal(changed.find(([name, data]) => name === "Divighost" && data.img)[1].img,
  "systems/lobia/assets/pokemon-lg/divighost.png");
assert.ok(actors.filter(actor => actor.type === "pokemon").every(actor =>
  actor.system.identity.level === 0 && actor.levelZeroVersion === 1));
const unprofiled = changed.find(([name]) => name === "Unlisted Pokémon")[1];
assert.deepEqual(Object.keys(unprofiled).sort(), ["_id", "flags.lobia.levelZeroVersion", "system.identity.level",
  "system.identity.nickname", "system.species.name"]);
assert.equal(changed.find(([name, data]) => name === actors[1].name && data["system.species.hpFormula"])[1]["system.species.hpFormula"], "3d4");
assert.equal(changed.find(([name, data]) => name === lobiaName && data.folder)[1].folder, "lg-acier");
assert.equal(changed.find(([name, data]) => name === noPortraitName && data.folder)[1].folder,
  folderByType.get(pokemonSpecies(noPortraitName).types[0]).id);
assert.equal(removedAccidental, true);
assert.equal(changed.find(([name, data]) => name === lobiaName && data["flags.lobia.speciesTemplateVersion"])[1]["flags.lobia.speciesTemplateVersion"], 6);
assert.equal(changed.find(([name, data]) => name === lobiaName && data.img)[1].img,
  "systems/lobia/assets/pokemon-lg/archeomirelobia.png");
assert.equal(changed.find(([name, data]) => name === lobiaName && data.img)[1]["prototypeToken.texture.src"],
  "systems/lobia/assets/pokemon-lg/archeomirelobia.png");
assert.deepEqual(Object.keys(changed.find(([name]) => name === "Courrousinge")[1]).sort(),
  ["_id", "flags.lobia.levelZeroVersion", "system.identity.level", "system.identity.nickname", "system.species.name"]);
assert.ok("system.pokemonTrees.-=ferosinge-1" in changed[0][1]);
assert.ok("system.pokemonTreeRolls.-=ferosinge-1-b3" in changed[0][1]);
assert.ok(batches.every(size => size <= 10));
assert.deepEqual(pack.locks, [false, true]);
await setupPokemonTemplates();
assert.equal(changed.length, firstUpdates);
assert.equal(createdCount, 229);
assert.deepEqual(pack.locks, [false, true]);
// Cleanup also works on a later login after all Actors have already been moved.
removedAccidental = false;
pack.folders.push(accidentalRoot);
await setupPokemonTemplates();
assert.equal(removedAccidental, true);
assert.deepEqual(pack.locks, [false, true, false, true]);
await setupPokemonTemplates({ force: true });
assert.ok(changed.length > firstUpdates);
assert.equal(changed.find(([name, data]) => name === "Courrousinge" && "system.talents.second" in data)[1]["system.talents.second"], "attention");
assert.equal(changed.find(([name, data]) => name === "Courrousinge" && "system.type.secondary" in data)[1]["system.type.secondary"], "spectre");
assert.equal(changed.find(([name, data]) => name === "Magnéti" && "system.identity.sex" in data)[1]["system.identity.sex"], "none");
assert.equal(changed.find(([name, data]) => name === "Motisma (Forme Tonte)" && "system.identity.sex" in data)[1]["system.identity.sex"], "none");
assert.equal(changed.find(([name, data]) => name === "Bekaglaçon (Tête Dégel)" && "system.stats.defense.base" in data)[1]["system.stats.defense.base"], 30);
assert.equal(pack.locked, true);
console.log("Bundled Pokémon templates: 231 LG profiles, nested type folders, batched/idempotent, restores lock: OK");
