import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const settings = new Map(), packs = new Map();
let sequence = 0, folderSequence = 0;
globalThis.game = {
  user: { isGM: true },
  packs: { get: id => packs.get(id) },
  settings: {
    get: (scope, key) => settings.get(`${scope}.${key}`),
    set: async (scope, key, value) => settings.set(`${scope}.${key}`, value)
  },
  actors: [],
  i18n: { localize: key => key, format: (key, data) => `${key} ${JSON.stringify(data)}` }
};
globalThis.ui = { notifications: { error: message => { throw new Error(message); } } };
globalThis.foundry = {
  abstract: { TypeDataModel: class { static migrateData(data) { return data; } } },
  data: { fields: Object.fromEntries(["SchemaField", "StringField", "NumberField", "BooleanField", "HTMLField", "ObjectField"]
    .map(name => [name, class { constructor(options = {}) { this.options = options; } }])) },
  documents: { collections: { CompendiumCollection: {
    async createCompendium({ name }) {
      const pack = {
        collection: `world.${name}`, docs: new Map(), foldersMap: new Map(), locked: false,
        get folders() { return this.foldersMap.values(); },
        async configure(options) { Object.assign(this, options); },
        async getIndex() {
          const rows = [...this.docs.values()].map(doc => ({
            _id: doc._id, flags: doc.flags, folder: doc.folder ?? null
          }));
          rows.size = rows.length;
          return rows;
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
      const _id = `t${++sequence}`;
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
globalThis.Folder = { implementation: {
  async createDocuments(entries, { pack }) {
    return entries.map(entry => {
      const id = `f${++folderSequence}`;
      const folder = { id, ...entry, getFlag: (scope, key) => entry.flags?.[scope]?.[key] };
      packs.get(pack).foldersMap.set(id, folder);
      return folder;
    });
  }
} };

const { TALENT_CATEGORIES, TALENT_CATALOGUE, TALENT_INTRODUCTION } = await import("../../module/packs/talents-data.mjs");
const registry = await import("../../module/data/talent-registry.mjs");
const { setupTalentCompendium, refreshTalentRegistry, talentPackId } = await import("../../module/packs/talent-pack.mjs");
assert.equal(TALENT_CATEGORIES.length, 17);
assert.equal(TALENT_CATALOGUE.length, 374);
assert.equal(typeof TALENT_INTRODUCTION, "string");
assert.equal(new Set(TALENT_CATALOGUE.map(t => t.key)).size, 374);
await setupTalentCompendium();
const pack = packs.get(talentPackId());
assert.equal(pack.docs.size, 374);
assert.equal(pack.foldersMap.size, 17);
assert.equal(registry.getTalents().length, 374);
const immunity = [...pack.foldersMap.values()].find(f => f.name === "Immunité");
assert.ok(immunity.description.includes("immunités"));
assert.ok([...pack.docs.values()].some(t => t.name === "Anti-bruit" && t.folder === immunity.id));

const talent = [...pack.docs.values()].find(t => t.name === "Anti-bruit");
let rerenders = 0;
game.actors.push({ type: "pokemon", sheet: { rendered: true, render: () => rerenders++ } });
packs.set("lobia.pokemons", { contents: [{ type: "pokemon", sheet: { rendered: true, render: () => rerenders++ } }] });
talent.name = "Anti-bruit modifié";
talent.system.effect = "Effet modifié";
await refreshTalentRegistry();
assert.equal(registry.getTalent("anti-bruit").name, "Anti-bruit modifié");
assert.equal(registry.getTalent("anti-bruit").effect, "Effet modifié");
assert.equal(rerenders, 2);

// The actual Pokémon sheet must expose catalogue keys and the GM-edited effect.
const { LOBIA } = await import("../../module/config.mjs");
globalThis.CONFIG = { LOBIA };
foundry.applications = {
  api: { HandlebarsApplicationMixin: Base => class extends Base {} },
  sheets: { ActorSheetV2: class { async _prepareContext() { return {}; } } }
};
foundry.utils = { escapeHTML: value => String(value) };
const { default: LobiaActorSheet } = await import("../../module/sheets/actor-sheet.mjs");
const sheet = new LobiaActorSheet();
sheet.actor = {
  type: "pokemon", name: "Test", system: {
    stats: Object.fromEntries(Object.keys(LOBIA.stats).map(key => [key, { base: 50, mod: 0, total: 50 }])),
    derived: {}, hp: { base: 10, max: 10, value: 10 }, battle: {},
    type: { primary: "normal", secondary: "" },
    identity: { nature: "" },
    treeProfile: { branches: [] }, pokemonTreePointsTotal: 0, pokemonTreePointsSpent: 0,
    pokemonTreePointsRemaining: 0,
    talents: { first: "anti-bruit", second: "", third: "", selected: "first" }
  }
};
const context = await sheet._prepareContext({});
assert.deepEqual(context.talentOptions.map(option => [option.slot, option.name, option.selected]),
  [["first", "Anti-bruit modifié", true]]);
assert.equal(context.selectedTalent.effect, "Effet modifié");
assert.equal(context.talentChoices["anti-bruit"], "Anti-bruit modifié");
assert.deepEqual(context.talentSlots.map(slot => slot.slot), ["first", "second", "third"]);

await setupTalentCompendium();
assert.equal(pack.docs.size, 374);
assert.equal(registry.getTalent("anti-bruit").effect, "Effet modifié");

const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
const old = Pokemon.migrateData({ talents: { first: "Anti-bruit", second: "Heavy Metal",
  third: "Talent personnel", hidden: true } });
assert.equal(old.talents.first, "anti-bruit");
assert.equal(old.talents.second, "heavy-metal");
assert.equal(old.talents.third, "Talent personnel");
assert.equal("hidden" in old.talents, false);

const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const hbs = require("handlebars");
hbs.registerHelper("localize", key => key);
hbs.registerHelper("selectOptions", () => new hbs.SafeString("<option>Talent</option>"));
const html = hbs.compile(fs.readFileSync("templates/item/talent.hbs", "utf8"))({
  item: talent, system: talent.system, categoryChoices: {}
});
assert.ok(html.trim().startsWith("<div") && html.trim().endsWith("</div>"));
for (const key of ["name", "system.key", "system.category", "system.effect"]) {
  assert.ok(html.includes(`name="${key}"`));
}

pack.docs.clear();
await refreshTalentRegistry({ rerender: false });
assert.equal(registry.getTalents().length, 0);
await setupTalentCompendium();
assert.equal(pack.docs.size, 0);
packs.delete(talentPackId());
await refreshTalentRegistry({ rerender: false });
assert.equal(registry.getTalents().length, 374);
console.log("Talent catalogue: 374 entries, 17 described folders, live edits, legacy names and reloads OK");
