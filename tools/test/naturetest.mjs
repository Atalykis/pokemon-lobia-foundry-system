import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const settings = new Map();
const packs = new Map();
let seq = 0;
globalThis.game = {
  user: { isGM: true },
  packs: { get: id => packs.get(id) },
  settings: {
    get: (scope, key) => settings.get(`${scope}.${key}`),
    set: async (scope, key, value) => settings.set(`${scope}.${key}`, value)
  },
  actors: [],
  i18n: { localize: key => key.replace("LOBIA.Nature.", ""), format: (key, data) => `${key} ${JSON.stringify(data)}` }
};
globalThis.ui = { notifications: { error: message => { throw new Error(message); } } };
globalThis.foundry = {
  abstract: { TypeDataModel: class {} },
  data: { fields: Object.fromEntries(["SchemaField", "StringField", "NumberField", "BooleanField", "HTMLField"]
    .map(name => [name, class { constructor(options = {}) { this.options = options; } }])) },
  documents: { collections: { CompendiumCollection: {
    async createCompendium({ name }) {
      const pack = {
        collection: `world.${name}`, locked: false, docs: new Map(),
        async configure(options) { Object.assign(this, options); },
        async getIndex() {
          const index = [...this.docs.values()].map(doc => ({
            _id: doc._id, flags: doc.flags, folder: doc.folder ?? null
          }));
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
    for (const entry of entries) {
      const _id = `n${++seq}`;
      packs.get(pack).docs.set(_id, { _id, ...entry });
    }
  },
  async updateDocuments(entries, { pack }) {
    for (const entry of entries) packs.get(pack).docs.set(entry._id, { ...packs.get(pack).docs.get(entry._id), ...entry });
  },
  async deleteDocuments(ids, { pack }) {
    for (const id of ids) packs.get(pack).docs.delete(id);
  }
} };

const registry = await import("../../module/data/nature-registry.mjs");
const { setupNatureCompendium, refreshNatureRegistry, naturePackId } = await import("../../module/packs/nature-pack.mjs");
assert.equal(registry.natureForRoll(70).key, "presse");
await setupNatureCompendium();
const pack = packs.get(naturePackId());
assert.equal(pack.docs.size, 25);
assert.equal(registry.getNatures().length, 25);
assert.equal(registry.natureForRoll(1).key, "assure");
assert.equal(registry.natureForRoll(100).key, "timide");

const bold = [...pack.docs.values()].find(doc => doc.system.key === "assure");
const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
const pokemon = new Pokemon();
Object.assign(pokemon, {
  hp: { base: 10, value: 10 }, identity: { nature: "assure" },
  stats: Object.fromEntries(["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"]
    .map(key => [key, { base: 50, mod: 0 }])),
  derivedMods: { armure: 0, barriere: 0, initiative: 0, physique: 0, special: 0 },
  battle: { action: { value: 1, max: 1 } }
});
pokemon.prepareDerivedData();
assert.equal(pokemon.stats.attaque.total, 40);
bold.name = "Assuré modifié";
bold.system.effects.attaque = -15;
let refreshed = 0;
game.actors.push({
  type: "pokemon", prepareData: () => { pokemon.prepareDerivedData(); refreshed++; },
  sheet: { rendered: true, render: () => refreshed++ }
});
packs.set("lobia.pokemons", { contents: [{ type: "pokemon", prepareData: () => refreshed++, sheet: { rendered: true, render: () => refreshed++ } }] });
await refreshNatureRegistry();
assert.equal(registry.getNature("assure").name, "Assuré modifié");
assert.equal(registry.getNature("assure").effects.attaque, -15);
assert.equal(pokemon.stats.attaque.total, 35);
assert.equal(pokemon.derived.physique.base, 3);
assert.equal(refreshed, 4);
assert.equal(registry.natureForRoll(4).name, "Assuré modifié");
bold.system.min = 2;
await refreshNatureRegistry({ rerender: false });
assert.equal(registry.natureForRoll(1), null);
assert.equal(registry.natureForRoll(2).key, "assure");
await setupNatureCompendium();
assert.equal(pack.docs.size, 25);
assert.equal(registry.getNature("assure").effects.attaque, -15);
assert.equal(registry.getNature("assure").min, 2);

// Every registry value is editable on the Item sheet, without changing its key on rename.
const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const hbs = require("handlebars");
hbs.registerHelper("localize", key => key);
const html = hbs.compile(fs.readFileSync("templates/item/nature.hbs", "utf8"))({
  item: bold, system: bold.system,
  statFields: Object.entries(bold.system.effects).map(([key, value]) => ({ key, label: key, value }))
});
assert.ok(html.trim().startsWith("<div") && html.trim().endsWith("</div>"));
for (const field of ["name", "system.key", "system.min", "system.max", ...Object.keys(bold.system.effects).map(k => `system.effects.${k}`)]) {
  assert.ok(html.includes(`name="${field}"`), `missing ${field}`);
}
pack.docs.clear();
await refreshNatureRegistry({ rerender: false });
assert.equal(registry.getNatures().length, 0);
assert.equal(registry.natureForRoll(70), null);
await setupNatureCompendium();
assert.equal(pack.docs.size, 0, "an intentionally emptied pack must stay empty");
packs.delete(naturePackId());
await refreshNatureRegistry({ rerender: false });
assert.equal(registry.getNatures().length, 25, "missing pack uses bundled fallback");
console.log("Nature compendium: 25 seeded, live edits and rolls refreshed, reload preserves GM changes");
