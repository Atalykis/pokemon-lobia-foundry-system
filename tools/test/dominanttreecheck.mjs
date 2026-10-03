import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const packs = new Map();
const settings = new Map();
let seq = 0;
globalThis.game = {
  user: { isGM: true }, actors: [], packs,
  settings: { get: (_, key) => settings.get(key), set: async (_, key, value) => settings.set(key, value) },
  i18n: { localize: key => key, format: (key, { type }) => `${key} ${type}` }
};
globalThis.ui = { notifications: { error: message => { throw Error(message); } } };
globalThis.foundry = {
  abstract: { TypeDataModel: class {} },
  data: { fields: Object.fromEntries(["SchemaField", "StringField"].map(key =>
    [key, class { constructor(options) { this.options = options; } }])) },
  documents: { collections: { CompendiumCollection: {
    async createCompendium({ name }) {
      const pack = { collection: `world.${name}`, locked: true, docs: new Map(),
        async configure(options) { Object.assign(this, options); },
        async getIndex() {
          const index = [...this.docs.values()].map(doc => ({ _id: doc._id, flags: doc.flags }));
          index.size = index.length;
          return index;
        },
        async getDocuments() { return [...this.docs.values()]; }
      };
      packs.set(pack.collection, pack);
      return pack;
    }
  } } }
};
globalThis.Item = { implementation: {
  async createDocuments(entries, { pack }) {
    for (const entry of entries) packs.get(pack).docs.set(`d${++seq}`, { _id: `d${seq}`, ...entry });
  },
  async updateDocuments(entries, { pack }) {
    for (const entry of entries) packs.get(pack).docs.set(entry._id,
      { ...packs.get(pack).docs.get(entry._id), ...entry });
  },
  async deleteDocuments(ids, { pack }) {
    for (const id of ids) packs.get(pack).docs.delete(id);
  }
} };

const registry = await import("../../module/data/dominant-tree-registry.mjs");
const { setupDominantTreeCompendium, refreshDominantTreeRegistry, dominantTreePackId,
  importDominantTrees, isDominantTreeDocument } = await import("../../module/packs/dominant-tree-pack.mjs");
const { default: TreeModel } = await import("../../module/data/item-arbre-dominant.mjs");
const { POKEMON_TREE_NODES, POKEMON_TREE_ROWS } = await import("../../module/data/pokemon-tree.mjs");
assert.equal(Object.keys(TreeModel.defineSchema().labels.options).length, 10);
assert.equal(registry.getDominantTree("feu").labels.root, "Flammes solaires");
await setupDominantTreeCompendium();
const pack = packs.get(dominantTreePackId());
assert.equal(pack.docs.size, 18);
assert.equal(pack.locked, false);
const fire = [...pack.docs.values()].find(doc => doc.system.type === "feu");
assert.equal(isDominantTreeDocument({ ...fire, pack: pack.collection }), true);
assert.equal(Object.keys(fire.system.labels).length, Object.keys(POKEMON_TREE_NODES).length);
assert.match(fire.system.notes.end, /-10 Général/);
fire.system.labels.a1 = "Spécial + personnalisé";
fire.system.notes.root = "Règle modifiée par le MJ";
let updated = 0;
game.actors.push({ type: "pokemon", prepareData: () => updated++, sheet: { rendered: true, render: () => updated++ } });
packs.set("lobia.pokemons", { contents: [{ type: "pokemon", prepareData: () => updated++, sheet: { rendered: true, render: () => updated++ } }] });
await refreshDominantTreeRegistry();
assert.equal(registry.getDominantTree("feu").labels.a1, "Spécial + personnalisé");
assert.equal(registry.getDominantTree("feu").notes.root, "Règle modifiée par le MJ");
assert.equal(updated, 4);
await setupDominantTreeCompendium();
assert.equal(fire.system.labels.a1, "Spécial + personnalisé", "ordinary startup preserves GM edits");
assert.equal((await importDominantTrees()).updated, 0);
await importDominantTrees({ overwrite: true });
assert.equal(registry.getDominantTree("feu").labels.a1, "Spécial +");

pack.docs.delete(fire._id);
await refreshDominantTreeRegistry({ rerender: false });
assert.equal(registry.getDominantTree("feu"), null, "deleting a tree removes it from Pokémon");
assert.ok(registry.getDominantTree("acier"));
pack.docs.clear();
await refreshDominantTreeRegistry({ rerender: false });
assert.equal(registry.getDominantTree("acier"), null, "empty pack is authoritative");
await setupDominantTreeCompendium();
assert.equal(pack.docs.size, 0, "ordinary startup does not repopulate an intentionally empty pack");
packs.delete(dominantTreePackId());
await refreshDominantTreeRegistry({ rerender: false });
assert.equal(registry.getDominantTree("feu").labels.a1, "Spécial +", "missing pack uses workbook");

const hbs = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/")("handlebars");
hbs.registerHelper("localize", key => key);
hbs.registerHelper("selectOptions", () => "");
const html = hbs.compile(fs.readFileSync("templates/item/arbre-dominant.hbs", "utf8"))({
  item: fire, system: fire.system, rows: POKEMON_TREE_ROWS.map(row => row.map(id => ({
    id, label: fire.system.labels[id], note: fire.system.notes[id]
  })))
});
assert.equal((html.match(/name="system.labels\./g) ?? []).length, 10);
assert.equal((html.match(/name="system.notes\./g) ?? []).length, 10);
assert.equal((html.match(/lobia-arbre-row cells-/g) ?? []).length, 7);
console.log("Dominant tree compendium: 18 seeded, GM edits, registry refresh and item sheet: OK");
