/** Replay init+ready and exercise the skill compendium -> registry pipeline. */
const fields = {};
for (const n of ["NumberField","StringField","HTMLField","ObjectField","ArrayField","BooleanField","SchemaField","FilePathField","ColorField","SetField","DocumentIdField"]) {
  fields[n] = class { constructor(o = {}) { this.options = o; } };
}
const hooks = { once: [], on: [] };
const world = { packs: new Map(), settings: new Map(), notifications: [], actors: [] };
let folderSeq = 0, docSeq = 0;

function makePack(collection, label) {
  const docs = new Map(), folders = new Map();
  return {
    collection, label, locked: false, _docs: docs, _folders: folders,
    get folders() { return { [Symbol.iterator]: () => folders.values() }; },
    async configure(c) { Object.assign(this, c); },
    async getIndex() {
      const arr = [...docs.values()].map(d => ({
        _id: d._id, name: d.name, system: d.system, folder: d.folder ?? null, flags: d.flags ?? {}
      }));
      arr.size = arr.length;
      return arr;
    },
    async getDocuments() { return [...docs.values()]; }
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
    async createCompendium({ name, label }) {
      const p = makePack("world." + name, label);
      world.packs.set(p.collection, p);
      return p;
    }
  } } }
};
globalThis.Actor = class {}; globalThis.Item = class {};
globalThis.Item.implementation = {
  async createDocuments(data, { pack }) {
    const p = world.packs.get(pack);
    for (const d of data) { const _id = "d" + (docSeq++); p._docs.set(_id, { _id, ...d }); }
    return data;
  },
  async updateDocuments(data, { pack }) {
    const p = world.packs.get(pack);
    for (const d of data) p._docs.set(d._id, { ...p._docs.get(d._id), ...d });
    return data;
  },
  async deleteDocuments(ids, { pack }) { const p = world.packs.get(pack); ids.forEach(i => p._docs.delete(i)); return ids; }
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
globalThis.Hooks = {
  once: (h, fn) => hooks.once.push([h, fn]),
  on: (h, fn) => hooks.on.push([h, fn]),
  call: () => true
};
globalThis.CONFIG = { Actor: { dataModels: {} }, Item: { dataModels: {} }, sounds: {}, statusEffects: [] };
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { LIMITED: 1 } };
globalThis.Macro = { async create(data) {
  game.macros.push({ getFlag: (scope, key) => data.flags?.[scope]?.[key] });
} };
globalThis.game = {
  settings: {
    register: (ns, k, c) => world.settings.set(ns + "." + k, c.default),
    get: (ns, k) => world.settings.get(ns + "." + k),
    set: async (ns, k, v) => world.settings.set(ns + "." + k, v)
  },
  i18n: { localize: k => k.replace(/^LOBIA\.Type\./, ""), format: (k, d) => k + " " + JSON.stringify(d), has: () => true },
  user: { isGM: true },
  packs: { get: id => world.packs.get(id) ?? null },
  macros: [],
  actors: world.actors
};
globalThis.ui = { notifications: { info: m => world.notifications.push(m), warn(){}, error: m => world.notifications.push("ERR " + m) } };

const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
await import(SYS + "/module/lobia.mjs");
await hooks.once.find(h => h[0] === "init")[1]();

const reg = await import(SYS + "/module/data/skill-registry.mjs");
console.log("before ready — source:", JSON.stringify(reg.registrySource()));

console.log("\n--- first load ---");
await hooks.once.find(h => h[0] === "ready")[1]();

const skillPack = world.packs.get("world.competences-dresseur");
const treePack = world.packs.get("world.arbres-dresseur");
const itemPack = world.packs.get("world.objets");
console.log("packs created:", [...world.packs.keys()].join(", "));
const sDocs = [...skillPack._docs.values()], tDocs = [...treePack._docs.values()];
console.log("Compétences Dresseur:", sDocs.length, "entries |", sDocs.filter(d => d.type === "competence").length, "competences |", skillPack._folders.size, "folders");
console.log("Arbres Dresseur     :", tDocs.length, "entries |", tDocs.filter(d => d.type === "arbre").length, "arbres |", treePack._folders.size, "folders (expect 0)");
console.log("Objets              :", itemPack._docs.size, "items |", itemPack._folders.size, "folders");
console.log("no arbres in the skills pack:", sDocs.filter(d => d.type === "arbre").length === 0);
console.log("registry source:", JSON.stringify(reg.registrySource()));
console.log("acier skills:", reg.getSkills("acier").length, "| acier statA:", JSON.stringify(reg.getTreeLabels("acier").statA));

console.log("\n--- upgrade a legacy column-keyed compendium entry ---");
let skill = sDocs.find(d => d.system.key === "acier-machine");
skillPack._docs.set(skill._id, {
  ...skill,
  system: { ...skill.system, key: undefined, col: "C" },
  flags: { lobia: { key: "acier-C" } }
});
world.settings.set("lobia.skillsVersion", 1);
const beforeUpgrade = skillPack._docs.size;
await hooks.once.find(h => h[0] === "ready")[1]();
skill = skillPack._docs.get(skill._id);
console.log("no duplicate on key migration:", beforeUpgrade === skillPack._docs.size);
console.log("stable key stored:", skill.system.key, "| legacy col absent:", !("col" in skill.system));
console.log("registry migrated key:", JSON.stringify(reg.getSkill("acier-machine").name));

console.log("\n--- GM edits a tree label in Arbres Dresseur ---");
const arbre = tDocs.find(d => d.system.type === "acier");
treePack._docs.set(arbre._id, { ...arbre, system: { ...arbre.system, labels: { ...arbre.system.labels, statA: "Barrière +" } } });
await hooks.on.find(h => h[0] === "updateItem")[1]({ pack: "world.arbres-dresseur", type: "arbre" });
await new Promise(r => setTimeout(r, 300));
console.log("acier statA now:", JSON.stringify(reg.getTreeLabels("acier").statA), "(expect 'Barrière +')");

console.log("\n--- GM renames a skill in Compétences Dresseur ---");
skillPack._docs.set(skill._id, { ...skill, name: "Machine de guerre" });
await hooks.on.find(h => h[0] === "updateItem")[1]({ pack: "world.competences-dresseur", type: "competence" });
await new Promise(r => setTimeout(r, 300));
console.log("acier-machine now:", JSON.stringify(reg.getSkill("acier-machine").name));

console.log("\n--- reload: no duplicates, edits survive ---");
const before = { s: skillPack._docs.size, t: treePack._docs.size };
await hooks.once.find(h => h[0] === "ready")[1]();
console.log("skills", before.s, "->", skillPack._docs.size, "| trees", before.t, "->", treePack._docs.size);
console.log("rename survived:", reg.getSkill("acier-machine").name, "| label survived:", JSON.stringify(reg.getTreeLabels("acier").statA));
