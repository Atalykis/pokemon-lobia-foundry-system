import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const Handlebars = require("handlebars");
const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
process.chdir(SYS);
const fr = JSON.parse(fs.readFileSync("lang/fr.json", "utf8"));
Handlebars.registerHelper("localize", k => fr[k] ?? String(k));
Handlebars.registerHelper("selectOptions", () => new Handlebars.SafeString(""));

const { TREE_DISPLAY_ROWS, TREE_NODES_BY_ID } = await import(`${SYS}/module/data/tree-template.mjs`);
const reg = await import(`${SYS}/module/data/skill-registry.mjs`);

// --- trainer tree tab
const tree = Handlebars.compile(fs.readFileSync("templates/actor/trainer-tree.hbs", "utf8"))({
  tab: { active: true, group: "sheet", id: "tree" },
  skillPoints: { total: 5, spent: 2, remaining: 3 },
  skillSteps: { slots: 2, spent: 1, remaining: 1 },
  branchTrees: [{ type: "acier", label: "Acier", rows: TREE_DISPLAY_ROWS.map(ids => ids.map(id => ({
    id, branch: "acier", kind: TREE_NODES_BY_ID[id].kind,
    label: TREE_NODES_BY_ID[id].kind === "bonus"
      ? reg.getTreeLabels("acier")[TREE_NODES_BY_ID[id].labelSlot] : "Compétence Dresseur",
    status: "locked" }))) }],
  skillPanel: [], typeChoices: {}, secondaryType: "", thirdType: "", fourthType: "", baseTypeLabel: "Normal"
});
console.log("trainer tree — title present:", /lobia-tree-title[^>]*>Acier</.test(tree));
console.log("trainer tree — rows:", (tree.match(/lobia-tree-row /g) || []).length, "(expect 7)");
console.log("trainer tree — nodes:", (tree.match(/lobia-node /g) || []).length, "(expect 10)");
console.log("trainer tree — root cells:", (tree.match(/kind-root/g) || []).length, "(expect 0)");
console.log("trainer tree — first node kind:",
  /lobia-node kind-(\w+)/.exec(tree)?.[1], "(expect competence)");

// --- arbre item sheet
const labels = { statA: "Armure +", subRecharge: "Sans recharge Acier", immunite: "Immunité Poison",
                 subConnaissance: "Connaissances Acier", statB: "Réaction +", subMaitre: "Maître Acier" };
const rows = TREE_DISPLAY_ROWS.map(ids => ids.map(id => {
  const node = TREE_NODES_BY_ID[id];
  const editable = node.kind === "bonus";
  return { id, kind: node.kind, editable, slot: node.labelSlot ?? null,
           value: editable ? labels[node.labelSlot] ?? "" : null,
           label: editable ? null : (fr[`LOBIA.Tree.${node.kind}`] ?? node.kind) };
}));
const arbre = Handlebars.compile(fs.readFileSync("templates/item/arbre.hbs", "utf8"))({
  item: { name: "Arbre Acier" }, system: { type: "acier", labels }, typeChoices: {}, rows
});
console.log("\narbre sheet — rows:", (arbre.match(/lobia-arbre-row /g) || []).length, "(expect 7)");
console.log("arbre sheet — editable cells:", (arbre.match(/lobia-arbre-cell editable/g) || []).length, "(expect 6)");
console.log("arbre sheet — root cells:", (arbre.match(/kind-root/g) || []).length, "(expect 0)");
