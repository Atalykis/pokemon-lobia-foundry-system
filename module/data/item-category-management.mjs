import {
  customItemCategories, itemCategoryLabels, itemCategorySubcategories,
  itemTaxonomy, itemCategoryName, ITEM_SUBCATEGORIES
} from "./item-taxonomy.mjs";
import { ITEM_CATALOGUE } from "../packs/items-data.mjs";
import { ensureFolders } from "../packs/item-pack.mjs";

/** Find objects or nested folders still depending on one or more subcategory keys. */
async function categoryInUse(subKeys, folderKeys = []) {
  const wanted = new Set(subKeys);
  if (ITEM_CATALOGUE.some(entry => wanted.has(entry.subcategory))) return true;
  const carriesItem = item => item.type === "objet" && wanted.has(item.system?.subcategory);
  if ([...game.items].some(carriesItem)
    || [...game.actors].some(actor => [...actor.items].some(carriesItem))
    || [...game.scenes].some(scene => [...scene.tokens].some(token =>
      token.actor && [...token.actor.items].some(carriesItem)))) return true;

  const itemPack = game.packs.get(`world.${CONFIG.LOBIA.itemPack.name}`);
  const folders = [...(itemPack?.folders ?? [])];
  const removable = folders.filter(folder => folderKeys.includes(folder.getFlag("lobia", "key")));
  const ids = new Set(removable.map(folder => folder.id));
  const folderId = folder => typeof folder?.folder === "string" ? folder.folder : folder?.folder?.id;
  if (folders.some(folder => !ids.has(folder.id) && ids.has(folderId(folder)))) return true;

  for (const pack of game.packs.values()) {
    if (pack.documentName === "Item") {
      const index = await pack.getIndex({ fields: ["system.subcategory", "folder"] });
      if ([...index].some(entry => wanted.has(entry.system?.subcategory)
        || (pack === itemPack && ids.has(entry.folder)))) return true;
    } else if (pack.documentName === "Actor") {
      const actors = await pack.getDocuments();
      if (actors.some(actor => [...actor.items].some(carriesItem))) return true;
    }
  }
  return false;
}

/** Rename a category and its subcategories without changing persisted item keys. */
export async function saveItemCategoryLabels(key, name, subNames, { addName = "", remove = [] } = {}) {
  if (!game.user.isGM) return "forbidden";
  const category = itemTaxonomy().find(entry => entry.key === key);
  if (!category) return "missing";
  name = name?.trim();
  addName = addName.trim();
  const subKeys = category.subs.map(sub => `${key}-${sub}`);
  if (!Array.isArray(remove) || remove.some(sub => !subKeys.includes(sub))) return "invalid";
  const kept = subKeys.filter(sub => !remove.includes(sub));
  const names = kept.map(sub => subNames?.[sub]?.trim());
  if (!name || name.length > 80 || (addName && addName.length > 80)
    || names.some(sub => !sub || sub.length > 80)
    || new Set([...names, ...(addName ? [addName] : [])].map(sub => sub?.toLocaleLowerCase())).size
      !== names.length + Boolean(addName)
    || itemTaxonomy().some(other => other.key !== key
      && itemCategoryName(other.key).toLocaleLowerCase() === name.toLocaleLowerCase())) return "invalid";

  const pack = game.packs.get(`world.${CONFIG.LOBIA.itemPack.name}`);
  if (remove.length && await categoryInUse(remove, remove)) return "inUse";
  const subs = itemCategorySubcategories();
  const added = { ...subs.added };
  const hidden = new Set(subs.hidden ?? []);
  for (const sub of remove) {
    if (ITEM_SUBCATEGORIES[sub] || sub === `${key}-general`) hidden.add(sub);
    else added[key] = (added[key] ?? []).filter(entry => `${key}-${entry.key}` !== sub);
  }
  const newSub = addName ? `custom-${foundry.utils.randomID(12).toLowerCase()}` : null;
  if (newSub) added[key] = [...(added[key] ?? []), { key: newSub, name: addName }];

  // Do not remove a folder containing an object or another GM-created folder.
  for (const sub of remove) {
    const folder = [...(pack?.folders ?? [])].find(entry => entry.getFlag("lobia", "key") === sub);
    if (folder) await folder.delete();
  }
  if (remove.length || newSub) await game.settings.set("lobia", "itemCategorySubcategories", {
    ...subs, added, hidden: [...hidden]
  });

  const current = itemCategoryLabels();
  const subcategories = { ...current.subcategories };
  for (const sub of remove) delete subcategories[sub];
  kept.forEach((sub, i) => { subcategories[sub] = names[i]; });
  await game.settings.set("lobia", "itemCategoryLabels", {
    ...current,
    categories: { ...current.categories, [key]: name },
    subcategories
  });

  for (const folder of pack?.folders ?? []) {
    const folderKey = folder.getFlag("lobia", "key");
    const label = folderKey === key ? name : subNames?.[folderKey]?.trim();
    if (label && folder.name !== label) await folder.update({ name: label });
  }
  if (newSub && pack) await ensureFolders(pack, [`${key}-${newSub}`]);
  return "saved";
}

/** Delete a GM category only when no object or catalogue folder contents depend on it. */
export async function deleteItemCategory(key) {
  if (!game.user.isGM) return "forbidden";
  const categories = customItemCategories();
  if (!categories.some(category => category.key === key)) return "missing";
  const settings = itemCategorySubcategories();
  const subKeys = [`${key}-general`, ...(settings.added?.[key] ?? []).map(sub => `${key}-${sub.key}`)];
  const folderKeys = [key, ...subKeys];
  if (await categoryInUse(subKeys, folderKeys)) return "inUse";
  const itemPack = game.packs.get(`world.${CONFIG.LOBIA.itemPack.name}`);
  for (const sub of subKeys) {
    const folder = [...(itemPack?.folders ?? [])].find(entry => entry.getFlag("lobia", "key") === sub);
    if (folder) await folder.delete();
  }
  const parent = [...(itemPack?.folders ?? [])].find(folder => folder.getFlag("lobia", "key") === key);
  if (parent) await parent.delete();
  await game.settings.set("lobia", "customItemCategories", categories.filter(category => category.key !== key));
  if (settings.added?.[key] || settings.hidden?.some(sub => sub.startsWith(`${key}-`))) {
    const added = { ...settings.added };
    delete added[key];
    await game.settings.set("lobia", "itemCategorySubcategories", {
      ...settings, added, hidden: (settings.hidden ?? []).filter(sub => !sub.startsWith(`${key}-`))
    });
  }
  const labels = itemCategoryLabels();
  if (labels.categories?.[key] || subKeys.some(sub => labels.subcategories?.[sub])) {
    const categoryLabels = { ...labels.categories };
    const subcategories = { ...labels.subcategories };
    delete categoryLabels[key];
    for (const sub of subKeys) delete subcategories[sub];
    await game.settings.set("lobia", "itemCategoryLabels", { ...labels, categories: categoryLabels, subcategories });
  }
  return "deleted";
}
