import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const categories = [{ key: "custom-camp", name: "Camping" }];
let labels = {};
let subcategorySettings = {};
globalThis.game = {
  settings: {
    get: (scope, key) => scope !== "lobia" ? null
      : key === "customItemCategories" ? categories : key === "itemCategoryLabels" ? labels
        : key === "itemCategorySubcategories" ? subcategorySettings : null,
    set: async (_scope, key, value) => {
      if (key === "customItemCategories") categories.splice(0, categories.length, ...value);
      else if (key === "itemCategoryLabels") labels = value;
      else if (key === "itemCategorySubcategories") subcategorySettings = value;
    }
  },
  i18n: { localize: key => key }, user: { isGM: true }, items: [], actors: [], scenes: []
};
globalThis.CONFIG = { LOBIA: { itemPack: { name: "objets" } } };
let nextId = 0;
globalThis.foundry = { utils: { randomID: () => `sub${++nextId}` } };

const { itemTaxonomy, categoryOf, itemCategoryName, itemSubcategoryName } =
  await import("../../module/data/item-taxonomy.mjs");
const { LOBIA } = await import("../../module/config.mjs");
assert.equal(categoryOf("bonus-soin"), "bonus");
assert.equal(categoryOf("custom-camp-general"), "custom-camp");
assert.equal(categoryOf("custom-other-general"), null);
assert.equal(itemCategoryName("custom-camp"), "Camping");
assert.equal(itemSubcategoryName("custom-camp-general"), "Camping");
assert.deepEqual(itemTaxonomy().at(-1).subs, ["general"]);
for (const [category, subs] of Object.entries({
  "objets-tenus": ["general"], equipement: ["armure", "vetement"], baies: ["general"]
})) {
  assert.deepEqual(itemTaxonomy().find(entry => entry.key === category).subs, subs);
  assert.ok(LOBIA.inventoryBuckets.includes(category), `${category} has a trainer inventory stash`);
  for (const sub of subs) assert.equal(categoryOf(`${category}-${sub}`), category);
}

const folders = [];
globalThis.Folder = { implementation: { createDocuments: async (data, { pack }) => {
  assert.equal(pack, "world.objets");
  const created = data.map(entry => ({
    id: `folder-${folders.length + 1}`,
    ...entry,
    getFlag: (scope, key) => entry.flags[scope][key],
    update: async function (changes) { Object.assign(this, changes); },
    delete: async function () { folders.splice(folders.indexOf(this), 1); }
  }));
  folders.push(...created);
  return created;
} } };
const { ensureFolders } = await import("../../module/packs/item-pack.mjs");
const indexedItems = [];
const pack = { collection: "world.objets", documentName: "Item", folders,
  getIndex: async () => indexedItems };
game.packs = new Map([[pack.collection, pack]]);
const mapping = await ensureFolders(pack, ["custom-camp-general"]);
assert.equal(folders.length, 2);
assert.equal(folders[0].name, "Camping");
assert.equal(folders[1].folder, folders[0].id);
assert.equal(mapping.get("custom-camp-general"), folders[1].id);
await ensureFolders(pack, ["custom-camp-general"]);
assert.equal(folders.length, 2, "creating the category again must reuse its folders");

const { deleteItemCategory, saveItemCategoryLabels } = await import("../../module/data/item-category-management.mjs");
await ensureFolders(pack, ["objets-tenus-general", "equipement-armure", "equipement-vetement", "baies-general"]);
for (const key of ["objets-tenus-general", "equipement-armure", "equipement-vetement", "baies-general"]) {
  assert.ok(folders.some(folder => folder.getFlag("lobia", "key") === key));
}
assert.equal(await saveItemCategoryLabels("equipement", "Tenues", {
  "equipement-armure": "Protection", "equipement-vetement": "Habits"
}), "saved");
assert.equal(itemCategoryName("equipement"), "Tenues");
assert.equal(itemSubcategoryName("equipement-vetement"), "Habits");
assert.equal(categoryOf("equipement-armure"), "equipement", "renaming does not change item classification");
assert.equal(folders.find(folder => folder.getFlag("lobia", "key") === "equipement").name, "Tenues");
assert.equal(folders.find(folder => folder.getFlag("lobia", "key") === "equipement-armure").name, "Protection");
assert.equal(await saveItemCategoryLabels("equipement", "Tenues", {
  "equipement-armure": "Protection", "equipement-vetement": "Habits"
}, { addName: "Gants" }), "saved");
const newSub = "equipement-custom-sub1";
assert.equal(categoryOf(newSub), "equipement");
assert.equal(itemSubcategoryName(newSub), "Gants");
assert.equal(folders.find(folder => folder.getFlag("lobia", "key") === newSub).name, "Gants");
game.items.push({ type: "objet", system: { subcategory: newSub } });
assert.equal(await saveItemCategoryLabels("equipement", "Tenues", {
  "equipement-armure": "Protection", "equipement-vetement": "Habits"
}, { remove: [newSub] }), "inUse", "cannot remove a subcategory used by a world object");
game.items.length = 0;
assert.equal(await saveItemCategoryLabels("equipement", "Tenues", {
  "equipement-armure": "Protection", "equipement-vetement": "Habits"
}, { remove: [newSub] }), "saved");
assert.equal(categoryOf(newSub), null);
assert.ok(!folders.some(folder => folder.getFlag("lobia", "key") === newSub));
assert.equal(await saveItemCategoryLabels("bonus", "Bonus", {
  "bonus-combat": "Combat", "bonus-accelerateur": "Accélérateur", "bonus-plumes": "Plumes"
}, { remove: ["bonus-soin"] }), "inUse", "cannot remove a built-in subcategory used by source data");
assert.equal(await saveItemCategoryLabels("equipement", "Tenues", {
  "equipement-armure": "Protection"
}, { remove: ["equipement-vetement"] }), "saved", "unused built-in subcategories can be removed");
assert.equal(categoryOf("equipement-vetement"), null);
assert.deepEqual(itemTaxonomy().find(cat => cat.key === "equipement").subs, ["armure"]);
assert.equal(await saveItemCategoryLabels("custom-camp", "Tenues", {
  "custom-camp-general": "Camp" }), "invalid", "category labels must be unique");
assert.equal(await saveItemCategoryLabels("custom-camp", "Bivouac", {
  "custom-camp-general": "Camp" }), "saved");
assert.equal(itemCategoryName("custom-camp"), "Bivouac");
assert.equal(itemSubcategoryName("custom-camp-general"), "Camp");
assert.equal(await saveItemCategoryLabels("custom-camp", "Bivouac", {
  "custom-camp-general": "Camp"
}, { addName: "Feux" }), "saved");
const campSub = "custom-camp-custom-sub2";
game.items.push({ type: "objet", system: { subcategory: campSub } });
assert.equal(await deleteItemCategory("custom-camp"), "inUse", "category deletion checks added subcategories");
game.items.length = 0;
game.user.isGM = false;
assert.equal(await saveItemCategoryLabels("equipement", "Interdit", {}), "forbidden");
game.user.isGM = true;
assert.equal(await deleteItemCategory("bonus"), "missing", "built-in categories cannot be removed");
game.actors.push({ items: [{ type: "objet", system: { subcategory: "custom-camp-general", quantity: 0 } }] });
assert.equal(await deleteItemCategory("custom-camp"), "inUse", "carried items block deletion even at zero quantity");
game.actors.length = 0;
game.scenes.push({ tokens: [{ actor: { items: [
  { type: "objet", system: { subcategory: "custom-camp-general" } }
] } }] });
assert.equal(await deleteItemCategory("custom-camp"), "inUse", "unlinked token items block deletion");
game.scenes.length = 0;
indexedItems.push({ folder: folders[1].id, system: { subcategory: "custom-camp-general" } });
assert.equal(await deleteItemCategory("custom-camp"), "inUse", "compendium items block deletion");
indexedItems.length = 0;
const actorPack = { documentName: "Actor", getDocuments: async () => [{ items: [
  { type: "objet", system: { subcategory: "custom-camp-general" } }
] }] };
game.packs.set("world.trainers", actorPack);
assert.equal(await deleteItemCategory("custom-camp"), "inUse", "packed actors block deletion");
game.packs.delete("world.trainers");
assert.equal(await deleteItemCategory("custom-camp"), "deleted");
assert.equal(categories.length, 0);
assert.equal(folders.length, 6, "remaining system category folders stay intact");
assert.equal(categoryOf("custom-camp-general"), null);
assert.equal(categoryOf(campSub), null);
assert.equal(labels.categories["custom-camp"], undefined, "deletion clears label overrides");

const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const Handlebars = require("handlebars");
Handlebars.registerHelper("localize", key => key);
const inventory = Handlebars.compile(readFileSync(
  new URL("../../templates/actor/trainer-inventory.hbs", import.meta.url), "utf8"
))({ weaponSlots: [{ slot: 0, index: 1 }], weaponSlotLabels: { arme: "Tools", accessoire: "Trinkets" },
  buckets: LOBIA.inventoryBuckets.map(key => ({ key, label: itemCategoryName(key), icon: "fa-box",
    count: 0, groups: [], canEdit: true })), canCreateItemCategory: true });
for (const key of ["objets-tenus", "equipement", "baies"]) {
  assert.match(inventory, new RegExp(`data-drop-category="${key}"`));
}
assert.match(inventory, /Tools/);
assert.match(inventory, /Trinkets/);
assert.match(inventory, /data-action="editItemCategory"/);

console.log("Custom item categories, classification and catalogue folders: OK");
