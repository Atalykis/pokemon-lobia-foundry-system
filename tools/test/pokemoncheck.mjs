/** Compile the shared Pokémon header and Statistics tab with one/two-type data. */
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
import { pokemonMoveTooltip } from "../../module/data/pokemon-move-tooltip.mjs";

const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const Handlebars = require("handlebars");
const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
process.chdir(SYS);

const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
Handlebars.registerHelper("localize", key => fr[key] ?? String(key));
Handlebars.registerHelper("selectOptions", choices => new Handlebars.SafeString(
  Object.entries(choices ?? {}).map(([value, label]) => `<option value="${value}">${fr[label] ?? label}</option>`).join("")
));
Handlebars.registerPartial("lobiaStatBlock", fs.readFileSync("templates/actor/parts/stat-block.hbs", "utf8"));
Handlebars.registerPartial("lobiaDerivedBlock", fs.readFileSync("templates/actor/parts/derived-block.hbs", "utf8"));

const { defensiveProfile } = await import(`${SYS}/module/data/type-chart.mjs`);
const profile = defensiveProfile(["feu", "vol"]);
const singleTypeProfile = defensiveProfile(["eau", ""]);
const entries = predicate => Object.entries(profile).filter(([, multiplier]) => predicate(multiplier)).map(([type, mult]) => ({
  type, mult, multLabel: `×${mult}`, label: fr[`LOBIA.Type.${type}`]
}));
const types = Object.fromEntries(Object.keys(profile).map(type => [type, `LOBIA.Type.${type}`]));
const battle = ["deplacement", "action", "actionBonus", "reaction"].map(key => ({
  key, value: 1, max: 1, bonus: 0, total: 1, label: fr[`LOBIA.Battle.${key}`]
}));

const header = Handlebars.compile(fs.readFileSync("templates/actor/trainer-header.hbs", "utf8"))({
  actor: { name: "Dracaufeu", img: "charizard.webp" },
  system: { hp: { value: 20, base: 20, bonus: 0, max: 20 } },
  isPokemon: true,
  primaryType: "feu",
  secondaryType: "vol",
  typeChoices: types,
  battle,
  weaknesses: entries(multiplier => multiplier > 1),
  resistances: entries(multiplier => multiplier > 0 && multiplier < 1),
  immunities: entries(multiplier => multiplier === 0)
});
console.log("header has one root:", header.trim().startsWith("<div") && header.trim().endsWith("</div>"));
console.log("header has primary and secondary type fields:",
  /name="system\.type\.primary"/.test(header) && /name="system\.type\.secondary"/.test(header));
console.log("Fire/Flying has a ×4 Rock weakness:", profile.roche === 4 && /Roche\s*<b>×4<\/b>/.test(header));
console.log("Fire/Flying has Ground immunity:", profile.sol === 0 && /Immunités[\s\S]*Sol/.test(header));
console.log("one type works without a secondary:", singleTypeProfile.electrik === 2 && singleTypeProfile.feu === 0.5);

const stat = key => ({ key, base: 50, mod: 0, total: 50, modClass: "zero", label: fr[`LOBIA.Stat.${key}`] });
const stats = ["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"].map(stat);
const derived = ["armure", "barriere", "initiative", "physique", "special"].map(key => ({
  key, base: 5, bonus: 0, mod: 0, total: 5, modClass: "zero", icon: "fa-circle", label: fr[`LOBIA.Derived.${key}`]
}));
const combatResources = [
  { key: "hp", base: 20, basePath: "system.hp.base", bonus: 0, total: 20, icon: "fa-heart", label: "PV" },
  ...battle.map(resource => ({ ...resource, base: resource.max, basePath: `system.battle.${resource.key}.max`, icon: "fa-circle" }))
];
const statsTab = Handlebars.compile(fs.readFileSync("templates/actor/trainer-stats.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "stats" },
  statGroups: [stats], statBaseTotal: 250, derived, combatResources
});
const statSection = /<section class="lobia-stats">([\s\S]*?)<\/section>/.exec(statsTab)?.[1] ?? "";
console.log("Statistics tab has one root:", statsTab.trim().startsWith("<section") && statsTab.trim().endsWith("</section>"));
console.log("Pokémon has exactly five stat cards:", (statSection.match(/lobia-statcard"/g) || []).length === 5);
console.log("Trainer-only stats are absent:", !/Charisme|Discrétion|Talent|Connaissance/.test(statSection));
const historyTemplate = Handlebars.compile(fs.readFileSync("templates/actor/trainer-stats.hbs", "utf8"));
const historyBase = { tab: { id: "stats" }, acceleratorCount: 1,
  acceleratorHistory: [{ id: "spent1", name: "PV Plus", detail: "+5 PV", canRemove: true }] };
const gmHistory = historyTemplate(historyBase);
assert.ok(gmHistory.includes('data-action="removeAccelerator" data-accelerator-id="spent1"'));
assert.ok(!historyTemplate({ ...historyBase, acceleratorHistory: [
  { ...historyBase.acceleratorHistory[0], canRemove: false }
] }).includes('data-action="removeAccelerator"'));
assert.ok(!historyTemplate({ ...historyBase, isPokemonTemplate: true })
  .includes('data-accelerator-drop'));
const unusedHistory = historyTemplate({ ...historyBase,
  carriedAccelerators: [{ id: "unused1", name: "PP Plus", quantity: 2, canUse: true, canRemove: true }] });
assert.ok(unusedHistory.includes('data-action="removeUnusedAccelerator" data-item-id="unused1"'));
assert.ok(!historyTemplate({ ...historyBase,
  carriedAccelerators: [{ id: "unused1", name: "PP Plus", quantity: 2, canRemove: false }] })
  .includes('data-action="removeUnusedAccelerator"'));

const tree = Handlebars.compile(fs.readFileSync("templates/actor/pokemon-tree.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "tree" },
  pokemonTreePoints: { total: 5, spent: 1, remaining: 4 },
  ctSlots: Array.from({ length: 4 }, (_, i) => ({ number: i + 1, branch: `tree-${i + 1}`,
    moveName: i === 0 ? "Surf" : "", canEdit: true })),
  pokemonBranches: [{ rows: [[{ id: "a1", branch: "test", label: "Charge", kind: "bonus",
    status: "unlocked", moveTooltip: "<div>Move &amp; effect</div>" },
  { id: "b1", branch: "test", label: "PV +", kind: "bonus", status: "locked", tooltip: "PV +" },
  { id: "end", branch: "test", label: "Tonnerre", kind: "terminal", status: "locked",
    restricted: true, ppMaxUnlocked: true, moveTooltip: "PP Max" }]] }]
});
assert.ok(!tree.includes("Capacités débloquées"));
assert.ok(tree.includes('data-tooltip-html="&lt;div&gt;Move &amp;amp; effect&lt;/div&gt;"'));
assert.ok(tree.includes('data-tooltip="PV +"'));
assert.ok(tree.includes('status-locked lobia-node-restricted lobia-node-pp-max'));
assert.ok(tree.includes('<span class="lobia-node-hp">PP Max</span>'));
assert.equal((tree.match(/class="lobia-ct-slot(?:\s|")/g) ?? []).length, 4);
assert.equal((tree.match(/data-action="chooseCtMove"/g) ?? []).length, 4);
assert.ok(tree.includes("Surf"));
const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const hover = pokemonMoveTooltip({ type: "normal", class: "Physique", damage: "1D8",
  difficulty: "---", contact: "Oui", description: "Sprint & contact\n<unsafe>" }, {
  name: "Charge", note: "Après évolution <test>", typeLabel: "Normal", categoryLabel: "Attaque basique",
  labels: { class: "Classe", damage: "Dégât", difficulty: "Difficulté", contact: "Contact" }, escape: esc
});
assert.ok(hover.includes("Sprint &amp; contact<br>&lt;unsafe&gt;"));
assert.ok(hover.includes("Après évolution &lt;test&gt;"));
assert.ok(!hover.includes("<unsafe>"));
const movesTemplate = Handlebars.compile(fs.readFileSync("templates/actor/pokemon-moves.hbs", "utf8"));
const flatCard = pokemonMoveTooltip({ type: "normal", class: "Physique", damage: "1D8",
  difficulty: "---", contact: "Oui", description: "Sprint & contact\n<unsafe>" }, {
  name: "Charge", typeLabel: "Normal", categoryLabel: "", note: "", escape: esc,
  labels: { class: "Classe", damage: "Dégât", difficulty: "Difficulté", contact: "Contact" }
});
const movesTab = movesTemplate({ tab: { active: true, group: "sheet", id: "moves" },
  pokemonMoves: [{ cardHtml: flatCard, isMetronome: true }, { cardHtml: flatCard }] });
assert.ok(movesTab.trim().startsWith('<section class="tab') && movesTab.trim().endsWith("</section>"));
assert.ok(movesTab.includes('data-tab="moves"'));
assert.equal((movesTab.match(/class="lobia-move-card"/g) ?? []).length, 2);
assert.equal((movesTab.match(/data-action="rollMetronome"/g) ?? []).length, 1);
assert.ok(!movesTab.includes("Capacités débloquées"));
assert.ok(!movesTab.includes("<h3>"));
assert.ok(!movesTab.includes('class="lobia-pokemon-move-group"'));
assert.ok(!movesTab.includes("Attaque basique"));
assert.ok(movesTab.includes("Sprint &amp; contact<br>&lt;unsafe&gt;"));
assert.ok(movesTab.includes("1D8"));
const emptyMovesTab = movesTemplate({ tab: { group: "sheet", id: "moves" }, pokemonMoves: [] });
assert.ok(emptyMovesTab.includes("Aucune capacité débloquée"));
console.log("Pokémon moves tab: flat hover-style cards and empty state: true");
