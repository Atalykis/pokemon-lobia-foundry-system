/** Manual statuses persist as token-visible ActiveEffects for Trainers and Pokémon. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
const en = JSON.parse(fs.readFileSync("lang/en.json", "utf8"));
const format = (key, values) => (fr[key] ?? key).replace(/\{(\w+)\}/g, (_, field) => values[field]);
globalThis.game = { user: { isGM: false }, i18n: { localize: key => fr[key] ?? key, format } };
globalThis.CONFIG = { LOBIA: (await import("../../module/config.mjs")).LOBIA, statusEffects: [] };
globalThis.foundry = {
  applications: { api: { HandlebarsApplicationMixin: Base => class extends Base {} },
    sheets: { ActorSheetV2: class {
      async _prepareContext() { return {}; }
      _toggleDisabled() {}
      async close() { return true; }
    } } },
  utils: { escapeHTML: value => value }
};
let nextId = 0;
globalThis.Actor = class {
  constructor(type) { this.type = type; this.name = type; this.effects = []; this.isOwner = true; }
  async createEmbeddedDocuments(type, entries) {
    assert.equal(type, "ActiveEffect");
    const created = entries.map(data => ({ ...data, id: `effect-${++nextId}`,
      statuses: new Set(data.statuses), disabled: false,
      getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
      async update(changes) {
        for (const [path, value] of Object.entries(changes)) {
          if (path.startsWith("flags.lobia.")) (this.flags.lobia ??= {})[path.slice(12)] = value;
          else this[path] = value;
        }
        return this;
      }
    }));
    this.effects.push(...created);
    return created;
  }
  async deleteEmbeddedDocuments(type, ids) {
    assert.equal(type, "ActiveEffect");
    this.effects = this.effects.filter(effect => !ids.includes(effect.id));
  }
};
const { default: LobiaActor } = await import("../../module/documents/actor.mjs");
const { default: LobiaActorSheet } = await import("../../module/sheets/actor-sheet.mjs");
const { LOBIA_STATUSES, actorStatusEffects, statusRule } = await import("../../module/data/statuses.mjs");
assert.equal(LOBIA_STATUSES.length, 16);
assert.equal(new Set(LOBIA_STATUSES.map(status => status.id)).size, 16);
assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
for (const status of LOBIA_STATUSES) {
  assert.ok(fr[`LOBIA.Status.${status.key}.name`] && fr[`LOBIA.Status.${status.key}.rule`]);
  assert.ok(fs.existsSync(`/home/atalykis/Downloads/FoundryVTT-Node-13.351/public/${status.img}`));
}
assert.match(statusRule(LOBIA_STATUSES[0], 3), /3D4/);
assert.match(statusRule(LOBIA_STATUSES[1], 4), /4D8/);
assert.match(statusRule(LOBIA_STATUSES[3], 4), /1D4/); // severe poison is fixed, not XD4
assert.doesNotMatch(statusRule(LOBIA_STATUSES[3], 4), /4D4/);

for (const type of ["trainer", "pokemon"]) {
  const actor = new LobiaActor(type);
  const created = await actor.setLobiaStatus("empoisonnement", 3);
  assert.equal(created.length, 1);
  assert.equal(actor.effects[0].statuses.has("lobia-empoisonnement"), true);
  assert.equal(actor.effects[0].img, "icons/svg/poison.svg");
  assert.equal(actor.effects[0].flags.lobia.level, 3);
  assert.match(actor.effects[0].description, /3D6/);
  assert.equal(actorStatusEffects(actor)[0].level, 3);
  await actor.setLobiaStatus("empoisonnement", 4);
  assert.equal(actor.effects.length, 1);
  assert.match(actor.effects[0].description, /4D6/);
  await actor.setLobiaStatus("brulure", 2);
  assert.equal(actor.effects.length, 2);
  assert.match(actor.effects[1].description, /2D4/);
  actor.system = {
    stats: Object.fromEntries(Object.keys(CONFIG.LOBIA.stats).map(key => [key, { base: 50, mod: 0 }])),
    derived: {}, hp: { value: 10, base: 10, max: 10 }, battle: {},
    combatStyle: "neutre", type: { primary: "normal", secondary: "" },
    identity: { nature: "", nickname: "", level: 1 }, talents: {},
    treeProfile: { branches: [] }, pokemonTreePointsTotal: 1,
    pokemonTreePointsSpent: 0, pokemonTreePointsRemaining: 1
  };
  const sheet = new LobiaActorSheet();
  sheet.actor = actor;
  const context = await sheet._prepareContext({});
  assert.deepEqual(context.actorStatuses.map(entry => [entry.name, entry.level]),
    [["Brûlure", 2], ["Empoisonnement", 4]]);
  assert.equal("brulure" in context.statusChoices, false);
  assert.equal("confusion" in context.statusChoices, true);
  assert.match(context.actorStatuses[0].rule, /2D4/);
  assert.equal(context.canAddStatus, true);
  if (type === "pokemon") {
    game.user.isGM = true;
    actor.pack = "lobia.pokemons";
    const packed = await sheet._prepareContext({});
    assert.equal(packed.canEditPokemonBranches, true);
    assert.equal(packed.isPokemonTemplate, true);
    actor.system.levelUpRolls = { "level-2": 5, "level-3": 7 };
    actor.system.hp.base = 22;
    actor.system.hp.max = 25;
    actor.system.hp.bonus = 3;
    const hpContext = await sheet._prepareContext({});
    assert.match(hpContext.combatResources[0].tooltip, /Niveau 2.*\+5/);
    assert.match(hpContext.combatResources[0].tooltip, /Niveau 3.*\+7/);
    assert.match(hpContext.combatResources[0].tooltip, /Bonus d.arbre.*\+3/);
    assert.match(hpContext.combatResources[0].tooltip, /Gains de niveaux.*\+12/);
    assert.match(hpContext.combatResources[0].tooltip, /Base hors niveaux enregistrés.*\+10/);
    const pack = { locked: true, async configure({ locked }) { this.locked = locked; } };
    game.packs = new Map([[actor.pack, pack]]);
    const buttons = [{ disabled: true }, { disabled: true }, { disabled: true }];
    sheet.form = { querySelectorAll: () => buttons };
    sheet._toggleDisabled(true);
    assert.ok(buttons.every(button => !button.disabled));
    await sheet._unlockPokemonPack();
    assert.equal(pack.locked, false);
    await sheet.close();
    assert.equal(pack.locked, true);
    game.user.isGM = false;
    actor.pack = null;
  }
  actor.effects[0].disabled = true;
  assert.deepEqual(actorStatusEffects(actor).map(entry => entry.status.key), ["brulure"]);
  await actor.setLobiaStatus("empoisonnement", 1);
  assert.equal(actor.effects.length, 2);
  assert.equal(actor.effects[0].disabled, false);
  assert.equal(actor.effects[0].flags.lobia.level, 1);
  await actor.setLobiaStatus("brulure", 5);
  await actor.setLobiaStatus("unknown", 1);
  assert.equal(actor.effects.length, 2);
  await actor.removeLobiaStatus("empoisonnement");
  assert.deepEqual(actorStatusEffects(actor).map(entry => entry.status.key), ["brulure"]);
  await actor.removeLobiaStatus("brulure");
  assert.equal(actor.effects.length, 0);
}

// The shared header offers both actor types the same status selector and active chips.
const Handlebars = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/")("handlebars");
Handlebars.registerHelper("localize", key => fr[key] ?? key);
Handlebars.registerHelper("selectOptions", choices => new Handlebars.SafeString(Object.entries(choices ?? {})
  .map(([key, name]) => `<option value="${key}">${name}</option>`).join("")));
const template = Handlebars.compile(fs.readFileSync("templates/actor/trainer-header.hbs", "utf8"));
Handlebars.registerPartial("lobiaStatBlock", "<div></div>");
Handlebars.registerPartial("lobiaDerivedBlock", "<div></div>");
const stats = Handlebars.compile(fs.readFileSync("templates/actor/trainer-stats.hbs", "utf8"))({
  tab: { id: "stats" }, combatResources: [{ label: "PV", base: 22, bonus: 3, total: 25,
    tooltip: "<b>Niveau 2 +5</b>" }]
});
assert.match(stats, /data-tooltip-html="&lt;b&gt;Niveau 2 \+5&lt;\/b&gt;"/);
for (const type of ["trainer", "pokemon"]) {
  const html = template({ actor: { id: "test", name: "Test", img: "" }, isPokemon: type === "pokemon",
    isTrainer: type === "trainer", system: { hp: { value: 10, max: 10 }, combatStyle: "neutre" },
    battle: [], canEditStatuses: true, canAddStatus: true, statusChoices: { empoisonnement: "Empoisonnement" },
    statusLevelChoices: { 1: "Niv. 1", 2: "Niv. 2", 3: "Niv. 3", 4: "Niv. 4" },
    actorStatuses: [{ key: "empoisonnement", name: "Empoisonnement", img: "icons/svg/poison.svg",
      level: 3, levelLabel: "Niv. 3", rule: "Subit 3D6 dégâts.", canLower: true, canRaise: true }] });
  assert.equal((html.match(/data-action="addStatus"/g) ?? []).length, 1);
  assert.match(html, /data-role="lobia-status-key"/);
  assert.match(html, /data-role="lobia-status-level"/);
  assert.match(html, /Subit 3D6 dégâts/);
  assert.match(html, /data-action="removeStatus"/);
  assert.match(html, /icons\/svg\/poison.svg/);
}
console.log("Lobia statuses: 16 rules/icons, level changes, actor ActiveEffects and both headers OK");
