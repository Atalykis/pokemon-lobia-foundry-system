/** Replay the system's ready hook against a fake world, with compendium folders. */
const fields = {};
for (const n of ["NumberField","StringField","HTMLField","ObjectField","ArrayField","BooleanField","SchemaField","FilePathField","ColorField","SetField","DocumentIdField"]) {
  fields[n] = class { constructor(o = {}) { this.options = o; } };
}
const hooks = [];
const world = { packs: new Map(), settings: new Map(), notifications: [] };
let folderSeq = 0, itemSeq = 0;

function makePack(collection, label, type) {
  const docs = new Map();
  const folders = new Map();
  return {
    collection, label, type, locked: false,
    _docs: docs, _folders: folders,
    get folders() { return { [Symbol.iterator]: () => folders.values() }; },
    async configure(c) { Object.assign(this, c); },
    async getDocuments() { return [...docs.values()]; },
    async getIndex() {
      const arr = [...docs.values()].map(d => ({
        _id: d._id, name: d.name, system: d.system, folder: d.folder ?? null
      }));
      arr.size = arr.length;
      return arr;
    }
  };
}

globalThis.foundry = {
  abstract: { TypeDataModel: class { static defineSchema(){return {};} static migrateData(s){return s;} } },
  data: { fields },
  utils: { escapeHTML: s => s },
  applications: {
    api: { HandlebarsApplicationMixin: B => class extends B {}, DialogV2: class {} },
    sheets: { ActorSheetV2: class {}, ItemSheetV2: class {} },
    apps: { DocumentSheetConfig: { registerSheet(){} } },
    handlebars: { loadTemplates: () => Promise.resolve() }
  },
  documents: { collections: { CompendiumCollection: {
    async createCompendium({ name, label, type }) {
      const pack = makePack("world." + name, label, type);
      world.packs.set(pack.collection, pack);
      return pack;
    }
  } } }
};

globalThis.Actor = class {};
globalThis.Item = class {};
globalThis.Item.implementation = {
  async createDocuments(data, { pack }) {
    const p = world.packs.get(pack);
    for (const d of data) { const _id = "i" + (itemSeq++); p._docs.set(_id, { _id, ...d }); }
    return data;
  },
  async updateDocuments(data, { pack }) {
    const p = world.packs.get(pack);
    for (const d of data) p._docs.set(d._id, { ...p._docs.get(d._id), ...d });
    return data;
  },
  async deleteDocuments(ids, { pack }) {
    const p = world.packs.get(pack);
    for (const i of ids) p._docs.delete(i);
    return ids;
  }
};
globalThis.JournalEntry = class {};
globalThis.JournalEntry.implementation = {
  async createDocuments(data, { pack }) {
    const p = world.packs.get(pack);
    return data.map(d => {
      const id = "j" + (folderSeq++);
      const entry = {
        id, _id: id, name: d.name, sort: d.sort, flags: d.flags ?? {},
        pages: (d.pages ?? []).map((pg, i) => ({
          id: id + "p" + i, ...pg, getFlag(ns, k) { return this.flags?.[ns]?.[k]; }
        })),
        getFlag(ns, k) { return this.flags?.[ns]?.[k]; },
        async createEmbeddedDocuments(_t, pages) { this.pages.push(...pages); return pages; },
        async updateEmbeddedDocuments(_t, u) { return u; },
        async deleteEmbeddedDocuments(_t, ids) { this.pages = this.pages.filter(p => !ids.includes(p.id)); return ids; }
      };
      p._docs.set(id, entry);
      return entry;
    });
  }
};
globalThis.Folder = class {};
globalThis.Folder.implementation = {
  async createDocuments(data, { pack }) {
    const p = world.packs.get(pack);
    return data.map(d => {
      const id = "f" + (folderSeq++);
      const doc = { ...d, id, _id: id, getFlag: (ns, k) => d.flags?.[ns]?.[k] };
      p._folders.set(id, doc);
      return doc;
    });
  }
};

globalThis.Hooks = { once: (h, fn) => hooks.push([h, fn]), call: () => true, on(){} };
globalThis.CONFIG = { Actor: { dataModels: {} }, Item: { dataModels: {} }, sounds: {}, statusEffects: [] };
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { LIMITED: 1 } };
globalThis.Macro = { async create(data) {
  game.macros.push({ getFlag: (scope, key) => data.flags?.[scope]?.[key] });
} };
globalThis.game = {
  settings: {
    register: (ns, key, cfg) => world.settings.set(ns + "." + key, cfg.default),
    get: (ns, key) => world.settings.get(ns + "." + key),
    set: async (ns, key, v) => world.settings.set(ns + "." + key, v)
  },
  i18n: {
    localize: k => k.replace(/^LOBIA\.Item\.(Category|Sub)\./, ""),
    format: (k, d) => k + " " + JSON.stringify(d),
    has: () => true
  },
  user: { isGM: true },
  macros: [],
  packs: { get: id => world.packs.get(id) ?? null }
};
globalThis.ui = { notifications: {
  info: m => world.notifications.push(["info", m]),
  warn: m => world.notifications.push(["warn", m]),
  error: m => world.notifications.push(["error", m])
} };

const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
await import(SYS + "/module/lobia.mjs");
await hooks.find(h => h[0] === "init")[1]();

// The user's world: catalogue v1 already imported, pack present.
world.settings.set("lobia.catalogueVersion", 1);
const seeded = makePack("world.objets", "Objets", "Item");
world.packs.set(seeded.collection, seeded);
await Item.implementation.createDocuments(
  [{ name: "Potion", type: "objet", system: { subcategory: "bonus-soin", short: "", price: 300, description: "" } },
   { name: "Poké Ball", type: "objet", system: { subcategory: "pokeball-standard", short: "", price: 200, description: "" } }],
  { pack: "world.objets" }
);

console.log("--- reload: v1 world, pack has 2 loose items, catalogue is now v2 ---");
await hooks.find(h => h[0] === "ready")[1]();

const p = world.packs.get("world.objets");
console.log("items:", p._docs.size, "| version:", world.settings.get("lobia.catalogueVersion"));

console.log("\n=== folder tree ===");
const all = [...p._folders.values()];
for (const root of all.filter(f => !f.folder).sort((a, b) => a.sort - b.sort)) {
  const kids = all.filter(f => f.folder === root.id).sort((a, b) => a.sort - b.sort);
  const total = [...p._docs.values()].filter(d => kids.some(k => k.id === d.folder)).length;
  console.log(`${root.name}  [${root.color}]  ${kids.length} sub-folders, ${total} items`);
  for (const k of kids) {
    console.log(`   └─ ${k.name}  (${[...p._docs.values()].filter(d => d.folder === k.id).length})`);
  }
}
console.log("folders:", all.length, "| items with no folder:", [...p._docs.values()].filter(d => !d.folder).length);
console.log("medieval items present:", [...p._docs.values()]
  .filter(d => ["arme-medieval", "arme-armure"].includes(d.system?.subcategory)).length, "(must be 0)");

console.log("\n--- re-import: no duplicate folders or items ---");
const before = { f: p._folders.size, i: p._docs.size };
await game.lobia.importItems();
console.log(`folders ${before.f} -> ${p._folders.size} | items ${before.i} -> ${p._docs.size}`);

console.log("\n--- a GM-moved item keeps its own folder ---");
const moved = [...p._docs.values()].find(d => d.name === "Potion");
p._docs.set(moved._id, { ...moved, folder: "gm-custom-folder" });
await game.lobia.importItems();
console.log("Potion folder after re-import:", p._docs.get(moved._id).folder, "(must be gm-custom-folder)");
