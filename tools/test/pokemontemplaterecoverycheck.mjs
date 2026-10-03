/** A single invalid template must not strand all other LG actors without profiles. */
import assert from "node:assert/strict";
import { setupPokemonTemplates } from "../../module/packs/pokemon-template-pack.mjs";
import { LOBIA_POKEDEX_SPECIES } from "../../module/data/pokemon-pokedex.mjs";
import { pokemonSpecies } from "../../module/data/pokemon-species.mjs";

const species = Object.values(LOBIA_POKEDEX_SPECIES);
const blockedName = species[0].name;
const folders = [];
const folderByType = new Map();
for (const type of new Set(species.map(entry => entry.types[0]))) {
  const name = ({ electrik: "Electrique", fee: "Fée", tenebres: "Ténèbres" })[type]
    ?? `${type[0].toUpperCase()}${type.slice(1)}`;
  const root = { id: `root-${type}`, name, folder: null };
  const lg = { id: `lg-${type}`, name: "LG", folder: root };
  folders.push(root, lg);
  folderByType.set(type, lg);
}
const documents = species.slice(0, 2).map((entry, index) => ({
  name: entry.name, type: "pokemon", id: `existing-${index}`, folder: null, version: 0,
  system: { pokemonTrees: {} },
  getFlag(scope, key) { return key === "lgArtworkVersion" ? this.artworkVersion ?? 0 : this.version; }
}));
const pack = { collection: "lobia.pokemons", locked: true, folders,
  async getDocuments() { return documents; },
  async configure({ locked }) { this.locked = locked; } };
globalThis.game = { user: { isGM: true }, packs: { get: id => id === pack.collection ? pack : null } };
globalThis.Folder = { implementation: { async createDocuments() {
  throw new Error("Nested LG folders already exist");
} } };
globalThis.Actor = { implementation: {
  async createDocuments(batch) {
    const created = batch.map((data, index) => ({ ...data, id: `created-${documents.length}-${index}`,
      folder: { id: data.folder }, version: 0, system: { pokemonTrees: {} },
      getFlag(scope, key) { return key === "lgArtworkVersion" ? this.artworkVersion ?? 0 : this.version; } }));
    documents.push(...created);
    return created;
  },
  async updateDocuments(batch) {
    if (batch.some(data => data["flags.lobia.speciesTemplateVersion"]
      && documents.find(doc => doc.id === data._id)?.name === blockedName)) {
      throw new Error("simulated invalid profile");
    }
    for (const data of batch) {
      const actor = documents.find(doc => doc.id === data._id);
      actor.version = data["flags.lobia.speciesTemplateVersion"] ?? actor.version;
      actor.artworkVersion = data["flags.lobia.lgArtworkVersion"] ?? actor.artworkVersion;
      if (data.folder) actor.folder = { id: data.folder };
    }
    return batch;
  }
} };
let notified = "";
globalThis.ui = { notifications: { error: message => { notified = message; } } };
await setupPokemonTemplates();
assert.equal(documents.length, 231);
assert.equal(documents[0].version, 0);
assert.equal(documents[1].version, 6);
assert.ok(documents.slice(2).every(actor => actor.version === (actor.name === "Divighost" ? 7 : 6)));
assert.ok(documents.every(actor => actor.folder?.id === folderByType.get(
  actor.name === "Divighost" ? "spectre" : pokemonSpecies(actor.name).types[0]).id));
assert.match(notified, /Archéomire \(Lobia\)/);
assert.equal(pack.locked, true);
console.log("LG import isolates a failed profile and completes other Pokémon: OK");
