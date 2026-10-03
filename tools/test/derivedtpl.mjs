import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const Handlebars = require("handlebars");
const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
process.chdir(SYS);
const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
Handlebars.registerHelper("localize", k => fr[k] ?? String(k));
Handlebars.registerPartial("lobiaStatBlock", fs.readFileSync("templates/actor/parts/stat-block.hbs", "utf8"));
Handlebars.registerPartial("lobiaDerivedBlock", fs.readFileSync("templates/actor/parts/derived-block.hbs", "utf8"));

const der = (key, base, bonus, mod, icon) => ({
  key, base: base + bonus, bonus, mod, total: base + bonus + mod,
  hasBonus: bonus !== 0,
  baseTooltip: bonus !== 0 ? `Socle ${base} + arbre ${bonus}` : null,
  modClass: mod > 0 ? "pos" : (mod < 0 ? "neg" : "zero"),
  icon, label: key
});
const mk = (key, base, mod) => ({ key, base, mod, total: base + mod, modClass: "zero", label: key });

const out = Handlebars.compile(fs.readFileSync("templates/actor/trainer-stats.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "stats" },
  statGroups: [["attaque", "defense"].map(k => mk(k, 50, 0))],
  statBaseTotal: 100,
  derived: [
    der("armure", 7, 2, 3, "fa-shield-halved"),
    der("barriere", 3, 0, 0, "fa-shield-virus"),
    der("initiative", 6, 0, -1, "fa-bolt")
  ],
  combatResources: [
    { key: "hp", base: 10, basePath: "system.hp.base", bonus: 6, total: 16, hasBonus: true, icon: "fa-heart", label: "PV" },
    { key: "deplacement", base: 2, basePath: "system.battle.deplacement.max", bonus: 0, total: 2, hasBonus: false, icon: "fa-person-running", label: "Déplacement" },
    { key: "action", base: 1, basePath: "system.battle.action.max", bonus: 2, total: 3, hasBonus: true, icon: "fa-hand-fist", label: "Action" },
    { key: "actionBonus", base: 1, basePath: "system.battle.actionBonus.max", bonus: 0, total: 1, hasBonus: false, icon: "fa-bolt", label: "Action Bonus" },
    { key: "reaction", base: 1, basePath: "system.battle.reaction.max", bonus: 0, total: 1, hasBonus: false, icon: "fa-shield-halved", label: "Réaction" }
  ]
});
const derivedOut = /<section class="lobia-derived">([\s\S]*?)<\/section>/.exec(out)?.[1] ?? "";
const battleOut = /<section class="lobia-battle-settings">([\s\S]*?)<\/section>/.exec(out)?.[1] ?? "";

console.log("single root:", out.trim().startsWith("<section") && out.trim().endsWith("</section>"));
console.log("derived cards:", (derivedOut.match(/lobia-statcard"/g) || []).length, "(expect 3)");
console.log("editable mod fields:", [...out.matchAll(/name="(system\.derivedMods\.\w+)"/g)].map(m => m[1]).join(", "));
console.log("no editable total:", !/name="[^"]*\.total"/.test(out));
console.log("derived bases are read-only spans:", (derivedOut.match(/<span class="lobia-derived-base/g) || []).length, "(expect 3)");
console.log("derived bonus highlight:", (derivedOut.match(/has-bonus/g) || []).length, "(expect 1 — armure only)");
console.log("bonus tooltip:", /data-tooltip="([^"]*arbre[^"]*)"/.exec(out)?.[1]);
console.log("mod classes:", [...out.matchAll(/lobia-statcell-mod (\w+)/g)].map(m => m[1]).join(", "));
console.log("derived totals:", [...derivedOut.matchAll(/lobia-stat-total">(-?\d+)</g)].map(m => m[1]).join(", "), "(expect 12, 3, 5)");
console.log("combat resource cards:", (battleOut.match(/lobia-statcard"/g) || []).length, "(expect 5)");
console.log("editable resource bases:", [...battleOut.matchAll(/name="(system\.(?:hp\.base|battle\.\w+\.max))"/g)].map(m => m[1]).join(", "));
console.log("resource totals:", [...battleOut.matchAll(/lobia-stat-total">(-?\d+)</g)].map(m => m[1]).join(", "), "(expect 16, 2, 3, 1, 1)");
console.log("battle current values remain out of stats tab:", !/name="system\.battle\.\w+\.value"/.test(battleOut));
