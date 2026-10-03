/** Chart dialog stays in sync with the rules used by Pokémon defensive profiles. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { attackMultiplier, defensiveProfile, TYPE_EFFECT } from "../../module/data/type-chart.mjs";

const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
globalThis.foundry = {
  utils: { escapeHTML: text => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;") },
  applications: { api: { DialogV2: class {
    constructor(options) { this.options = options; }
    render({ force }) { assert.equal(force, true); return this; }
  } } }
};
globalThis.game = { i18n: { localize: key => fr[key] ?? key } };
globalThis.window = { innerWidth: 900 };
const { TYPE_CHART_ORDER, typeChartContent, showTypeChart } = await import("../../module/macros/type-chart.mjs");
assert.equal(TYPE_CHART_ORDER.length, 18);
assert.deepEqual(new Set(TYPE_CHART_ORDER), new Set(Object.keys(TYPE_EFFECT)));
const content = typeChartContent();
assert.equal((content.match(/<tbody><tr>|<tr><th scope="row"/g) ?? []).length, 18);
assert.equal((content.match(/<td class="lobia-chart-/g) ?? []).length, 324);
assert.ok(content.includes('title="Normal → Spectre : 0×"'));
assert.ok(content.includes('title="Feu → Plante : 2×"'));
assert.ok(content.includes('title="Feu → Eau : ½×"'));
assert.ok(content.includes('title="Feu → Normal : 1×"'));
for (const attack of TYPE_CHART_ORDER) {
  const profile = defensiveProfile([attack]);
  for (const defense of TYPE_CHART_ORDER) {
    assert.equal(attackMultiplier(attack, defense), defensiveProfile([defense])[attack]);
    assert.equal(profile[defense], attackMultiplier(defense, attack));
  }
}
const dialog = showTypeChart();
assert.equal(dialog.options.position.width, 876);
assert.equal(dialog.options.buttons[0].action, "close");
assert.equal(dialog.options.content, content);
window.innerWidth = 1500;
assert.equal(showTypeChart().options.position.width, 1080);
window.innerWidth = 410;
assert.equal(showTypeChart().options.position.width, 386);
console.log("Type chart: 18×18 cells, labels, effective multipliers and responsive dialog: OK");
