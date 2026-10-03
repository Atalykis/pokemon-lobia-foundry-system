/**
 * Import every system module with a stubbed Foundry global, to catch errors that
 * would happen at *load* time (before any hook runs) — the kind that silently kills
 * a whole system in the browser.
 */
const field = (name) => class {
  constructor(opts = {}) { this.options = opts; this.name = name; }
};
const fields = {};
for (const n of ["NumberField", "StringField", "HTMLField", "ObjectField", "ArrayField",
                 "BooleanField", "SchemaField", "FilePathField", "ColorField", "SetField"]) {
  fields[n] = field(n);
}

class TypeDataModel {
  static defineSchema() { return {}; }
  static migrateData(s) { return s; }
}

const hooks = [];
globalThis.foundry = {
  abstract: { TypeDataModel, DataModel: TypeDataModel },
  data: { fields },
  utils: { escapeHTML: s => s, mergeObject: Object.assign },
  applications: {
    api: { HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {} },
    sheets: { ActorSheetV2: class {}, ItemSheetV2: class {} },
    apps: { DocumentSheetConfig: { registerSheet: () => {} } },
    handlebars: { loadTemplates: () => Promise.resolve() }
  },
  documents: { collections: { CompendiumCollection: class {} } }
};
globalThis.Actor = class {};
globalThis.Item = class {};
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { LIMITED: 1 } };
globalThis.Macro = { create: async data => {
  game.macros.push({ data, getFlag: (scope, key) => data.flags?.[scope]?.[key] });
} };
globalThis.Hooks = { once: (h, fn) => hooks.push([h, fn]), call: () => true, on: () => {} };
globalThis.CONFIG = { Actor: { dataModels: {} }, Item: { dataModels: {} }, sounds: {}, statusEffects: [] };
globalThis.game = {
  settings: { register: () => {}, get: () => false, set: async () => {} },
  i18n: { localize: k => k, format: k => k, has: () => true },
  user: { isGM: true },
  packs: { get: () => null },
  macros: []
};
globalThis.ui = { notifications: { info: () => {}, warn: () => {}, error: () => {} } };

const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
try {
  await import(`${SYS}/module/lobia.mjs`);
  console.log("✓ lobia.mjs imported with no load-time error");
  console.log("  hooks registered:", hooks.map(h => h[0]).join(", "));
} catch (err) {
  console.log("✗ LOAD FAILED:", err.message);
  console.log(err.stack.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}

// The init hook is where data models + sheets register.
const init = hooks.find(h => h[0] === "init");
try {
  await init[1]();
  console.log("✓ init hook ran");
  if (CONFIG.statusEffects.length !== 16 || new Set(CONFIG.statusEffects.map(status => status.id)).size !== 16) {
    throw new Error("All 16 Lobia token statuses should be registered once");
  }
  console.log("  actor models:", Object.keys(CONFIG.Actor.dataModels).join(", "));
  console.log("  item models :", Object.keys(CONFIG.Item.dataModels).join(", "));
  const { default: LobiaActorSheet } = await import(`${SYS}/module/sheets/actor-sheet.mjs`);
  const { default: LobiaTrainerSheet } = await import(`${SYS}/module/sheets/trainer-sheet.mjs`);
  if (!LobiaActorSheet.TABS.sheet.tabs.some(tab => tab.id === "moves") || !LobiaActorSheet.PARTS.moves
    || LobiaTrainerSheet.TABS.sheet.tabs.some(tab => tab.id === "moves") || LobiaTrainerSheet.PARTS.moves) {
    throw new Error("Pokémon Capacités tab must be available only on the Pokémon sheet");
  }
  const sheet = new LobiaActorSheet();
  sheet.actor = { type: "pokemon", name: "Lipoutti", system: { identity: { nickname: "Lili" } } };
  if (sheet.title !== "Lili") throw new Error("Pokémon window title should prefer nickname");
  sheet.actor.system.identity.nickname = "  ";
  if (sheet.title !== "Lipoutti") throw new Error("Pokémon window title should fall back to species name");
} catch (err) {
  console.log("✗ INIT FAILED:", err.message);
  console.log(err.stack.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}

// And the ready hook is where the compendium is meant to appear.
const ready = hooks.find(h => h[0] === "ready");
try {
  await ready[1]();
  if (typeof game.lobia.cleanupGeneratedGuide !== "function" || "buildRulebook" in game.lobia) {
    throw new Error("Guide must expose cleanup, not the retired Trainer chapter generator");
  }
  if (game.macros.length !== 3
    || game.macros[0].data.command !== "return game.lobia.quickRoll({ token, actor });"
    || game.macros[1].data.command !== "return game.lobia.rollMetronome({ token, actor });"
    || game.macros[2].data.command !== "return game.lobia.showTypeChart();") {
    throw new Error("Quick-roll, Métronome and type-chart Macros were not shared on GM ready");
  }
  await game.lobia.setupQuickRollMacro();
  await game.lobia.setupMetronomeMacro();
  await game.lobia.setupTypeChartMacro();
  if (game.macros.length !== 3) throw new Error("Lobia Macros were duplicated");
  console.log("✓ ready hook ran without throwing");
} catch (err) {
  console.log("✗ READY FAILED:", err.message);
  console.log(err.stack.split("\n").slice(0, 8).join("\n"));
}
