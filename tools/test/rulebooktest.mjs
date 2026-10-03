/** Retire only generated Trainer chapters; keep authored journals and Météo pages. */
import assert from "node:assert/strict";
import fs from "node:fs";

const translations = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
const packs = new Map();
let sequence = 0;
class Entry {
  constructor(data) {
    this.id = `journal-${++sequence}`;
    this.name = data.name;
    this.flags = structuredClone(data.flags ?? {});
    this.pages = (data.pages ?? []).map(page => this.#makePage(page));
  }
  #makePage(data) {
    return { id: `page-${++sequence}`, name: data.name, text: structuredClone(data.text ?? {}),
      flags: structuredClone(data.flags ?? {}),
      getFlag(scope, key) { return this.flags?.[scope]?.[key]; } };
  }
  getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  async createEmbeddedDocuments(type, pages) {
    assert.equal(type, "JournalEntryPage");
    const added = pages.map(page => this.#makePage(page));
    this.pages.push(...added);
    return added;
  }
  async updateEmbeddedDocuments(type, changes) {
    assert.equal(type, "JournalEntryPage");
    for (const change of changes) {
      const page = this.pages.find(page => page.id === change._id);
      if (change.name) page.name = change.name;
      if (change.text) page.text = structuredClone(change.text);
    }
  }
  async deleteEmbeddedDocuments(type, ids) {
    assert.equal(type, "JournalEntryPage");
    this.pages = this.pages.filter(page => !ids.includes(page.id));
  }
  async update(changes) {
    for (const [path, value] of Object.entries(changes)) {
      const field = path.slice("flags.lobia.".length);
      if (field.startsWith("-=")) delete this.flags.lobia[field.slice(2)];
      else (this.flags.lobia ??= {})[field] = value;
    }
    return this;
  }
}

globalThis.foundry = {
  utils: { escapeHTML: text => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;") },
  documents: { collections: { CompendiumCollection: {
    async createCompendium({ name, label, type }) {
      assert.equal(type, "JournalEntry");
      const pack = { collection: `world.${name}`, label, type, locked: false, ownership: {}, entries: new Map(),
        async configure(changes) { Object.assign(this, changes); },
        async getDocuments() { return [...this.entries.values()]; } };
      packs.set(pack.collection, pack);
      return pack;
    }
  } } }
};
globalThis.JournalEntry = { implementation: {
  async createDocuments(data, { pack }) {
    return data.map(source => {
      const entry = new Entry(source);
      packs.get(pack).entries.set(entry.id, entry);
      return entry;
    });
  },
  async deleteDocuments(ids, { pack }) {
    for (const id of ids) packs.get(pack).entries.delete(id);
  }
} };
globalThis.game = { user: { isGM: true }, packs: { get: id => packs.get(id) },
  i18n: { localize: key => translations[key] ?? key,
    format: (key, values) => (translations[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => values[k]) } };
globalThis.ui = { notifications: { error: message => { throw Error(message); }, info() {} } };

const { LOBIA } = await import("../../module/config.mjs");
const { cleanupGeneratedGuide, ensureRulebookPack, rulebookPackId } = await import("../../module/packs/rulebook.mjs");
const { setupWeatherJournal, renderWeatherPage } = await import("../../module/packs/weather-journal.mjs");
const { LOBIA_WEATHERS } = await import("../../module/data/weather-data.mjs");
const { pack } = await ensureRulebookPack();
assert.equal(pack.collection, rulebookPackId());
assert.equal(pack.ownership.PLAYER, "OBSERVER");

// This is what earlier versions actually seeded, including a GM note in Acier.
const chapters = await JournalEntry.implementation.createDocuments(Object.keys(LOBIA.types).map(type => ({
  name: type, flags: { lobia: { generated: true, key: `type-${type}` } },
  pages: ["arbre", "skills"].map(kind => ({
    name: `${kind}-${type}`, text: { content: `<p>${kind}</p>` },
    flags: { lobia: { generated: true, key: `${kind}-${type}` } }
  }))
})), { pack: pack.collection });
const acier = chapters.find(entry => entry.getFlag("lobia", "key") === "type-acier");
await acier.createEmbeddedDocuments("JournalEntryPage", [
  { name: "Notes du MJ", text: { content: "<p>Conserver mes notes.</p>" } }
]);
const [authored] = await JournalEntry.implementation.createDocuments([
  { name: "Règles de table", pages: [{ name: "Actions", text: { content: "<p>Personnel.</p>" } }] }
], { pack: pack.collection });
const [otherGenerated] = await JournalEntry.implementation.createDocuments([
  { name: "Autre générateur", flags: { lobia: { generated: true, key: "unrelated" } } }
], { pack: pack.collection });

assert.equal(LOBIA_WEATHERS.length, 17);
assert.equal(new Set(LOBIA_WEATHERS.map(weather => weather.key)).size, 17);
assert.equal(LOBIA_WEATHERS.filter(weather => weather.type === "glace").length, 2);
for (const weather of LOBIA_WEATHERS) {
  assert.ok(LOBIA.types[weather.type] && weather.paragraphs.length);
  const rendered = renderWeatherPage(weather);
  for (const paragraph of weather.paragraphs) assert.ok(rendered.includes(paragraph));
}
pack.locked = true;
assert.deepEqual(await setupWeatherJournal(), { created: 17, updated: 0, skipped: false });
assert.equal(pack.locked, true);
const weather = [...pack.entries.values()].find(entry => entry.getFlag("lobia", "key") === "weather");
assert.equal(weather.pages.length, 17);
assert.match(weather.pages.find(page => page.name === "Neige").text.content, /Nique la 9G\./);

const cleaned = await cleanupGeneratedGuide();
assert.deepEqual(cleaned, { removedChapters: 17, removedPages: 36, preservedChapters: 1 });
assert.equal(pack.locked, true);
assert.equal(pack.entries.size, 4);
assert.ok(pack.entries.has(weather.id) && pack.entries.has(authored.id) && pack.entries.has(otherGenerated.id));
assert.equal(acier.pages.length, 1);
assert.equal(acier.pages[0].text.content, "<p>Conserver mes notes.</p>");
assert.equal(acier.getFlag("lobia", "generated"), undefined);
assert.equal(acier.getFlag("lobia", "key"), undefined);
assert.deepEqual(await cleanupGeneratedGuide(), { removedChapters: 0, removedPages: 0, preservedChapters: 0 });

const rain = weather.pages.find(page => page.getFlag("lobia", "weatherKey") === "weather-pluie");
rain.text.content = "<p>Texte du MJ.</p>";
await weather.createEmbeddedDocuments("JournalEntryPage", [
  { name: "Notes météo du MJ", text: { content: "<p>Mes notes.</p>" } }
]);
assert.equal((await setupWeatherJournal()).skipped, true);
assert.equal(rain.text.content, "<p>Texte du MJ.</p>");
assert.deepEqual(await setupWeatherJournal({ force: true }), { created: 0, updated: 1, skipped: false });
assert.match(rain.text.content, /Dégâts de dégâts/);
assert.equal(weather.pages.length, 18);
assert.equal(pack.locked, true);
assert.equal(pack.entries.size, 4);
console.log("Guide cleanup: Trainer chapters removed, GM notes and 17 Météo pages preserved: OK");
