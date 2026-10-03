import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const Handlebars = require("handlebars");

const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
process.chdir(SYS);
const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
Handlebars.registerHelper("localize", k => fr[k] ?? String(k));
Handlebars.registerHelper("selectOptions", (c) => new Handlebars.SafeString(
  Object.entries(c ?? {}).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")));

const comp = Handlebars.compile(fs.readFileSync("templates/item/competence.hbs", "utf8"))({
  item: { img: "x.webp", name: "Machine" },
  system: { key: "acier-machine", type: "acier", category: "Attaque reçu", tiers: { 1: "t1", 2: "t2", 3: "t3" } },
  typeChoices: { acier: "Acier" }, categoryChoices: { "Attaque reçu": "Attaque reçu" }
});
let t = comp.trim();
console.log("competence — single root:", t.startsWith("<div") && t.endsWith("</div>"));
console.log("competence — fields:", [...comp.matchAll(/name="([\w.]+)"/g)].map(m => m[1]).join(", "));

const { TREE_ROWS, TREE_NODES_BY_ID } = await import(`${SYS}/module/data/tree-template.mjs`);
const labels = { statA: "Armure +", subRecharge: "Sans recharge Acier", immunite: "Immunité Poison",
                 subConnaissance: "Connaissances Acier", statB: "Réaction +", subMaitre: "Maître Acier" };
const rows = TREE_ROWS.map(ids => ids.map(id => {
  const node = TREE_NODES_BY_ID[id];
  const editable = node.kind === "bonus";
  return { id, kind: node.kind, editable, slot: node.labelSlot ?? null,
           value: editable ? labels[node.labelSlot] ?? "" : null,
           label: editable ? null : (fr[`LOBIA.Tree.${node.kind}`] ?? node.kind) };
}));
const arbre = Handlebars.compile(fs.readFileSync("templates/item/arbre.hbs", "utf8"))({
  item: { name: "Arbre Acier" }, system: { type: "acier", labels }, typeChoices: { acier: "Acier" }, rows
});
t = arbre.trim();
console.log("\narbre — single root:", t.startsWith("<div") && t.endsWith("</div>"));
console.log("arbre — rows:", (arbre.match(/lobia-arbre-row /g) || []).length, "(expect 8)");
console.log("arbre — editable cells:", (arbre.match(/lobia-arbre-cell editable/g) || []).length, "(expect 6)");
console.log("arbre — label inputs:", [...arbre.matchAll(/name="system\.labels\.(\w+)"/g)].map(m => m[1]).join(", "));
console.log("arbre — fixed cells:", [...arbre.matchAll(/lobia-arbre-cell kind-(\w+)">([^<]*)</g)].map(m => `${m[1]}:${m[2].trim()}`).join(" | "));

// The trainer tree tab must still render off the registry.
const reg = await import(`${SYS}/module/data/skill-registry.mjs`);
Handlebars.registerHelper("selectOptions", () => new Handlebars.SafeString(""));
const tree = Handlebars.compile(fs.readFileSync("templates/actor/trainer-tree.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "tree" },
  skillPoints: { total: 5, spent: 2, remaining: 3 },
  skillSteps: { slots: 2, spent: 1, remaining: 1 },
  branchTrees: [{ type: "acier", label: "Acier", rows: TREE_ROWS.map(ids => ids.map(id => ({
    id, branch: "acier", kind: TREE_NODES_BY_ID[id].kind,
    label: TREE_NODES_BY_ID[id].kind === "bonus" ? reg.getTreeLabels("acier")[TREE_NODES_BY_ID[id].labelSlot] : "x",
    status: "locked" }))) }],
  skillPanel: [{ type: "acier", label: "Acier", skills: reg.getSkills("acier").map(s => ({
    key: s.key, name: s.name, category: s.category, tier: 0, effect: s.tiers["1"], canLevel: true })) }],
  typeChoices: {}, secondaryType: "", thirdType: "", fourthType: "", baseTypeLabel: "Normal"
});
console.log("\ntrainer tree tab — single root:", tree.trim().startsWith("<section"));
console.log("trainer tree tab — nodes:", (tree.match(/lobia-node /g) || []).length, "(expect 8)");
console.log("trainer tree tab — skills listed:", (tree.match(/lobia-skill /g) || []).length, "(expect 11)");
