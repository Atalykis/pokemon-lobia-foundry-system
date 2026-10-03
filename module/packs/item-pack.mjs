import { LOBIA } from "../config.mjs";
import {
  ITEM_SUBCATEGORIES, DEFAULT_SUBCATEGORY, itemTaxonomy,
  itemCategoryName, itemSubcategoryName
} from "../data/item-taxonomy.mjs";
import { ITEM_CATALOGUE } from "./items-data.mjs";

/**
 * The item catalogue lives in a *world* compendium the GM fully owns: unlocked,
 * editable, and never overwritten by a system update.
 *
 * State is derived from the world itself — does the pack exist, is it empty, which
 * catalogue version was last imported — rather than from a one-shot "done" flag, so
 * deleting the pack and reloading rebuilds it.
 */

/** Bump when items-data.mjs changes and every world should pick the new list up. */
export const CATALOGUE_VERSION = 2;

const log = (...args) => console.log("Lobia |", ...args);

/** The pack's collection id, e.g. "world.objets". */
export function packId() {
  return `world.${LOBIA.itemPack.name}`;
}

/**
 * Return the item compendium, creating it if the world does not have it.
 * @returns {Promise<{pack: CompendiumCollection|null, created: boolean}>}
 *          `created` is true when this call is what brought the pack into existence —
 *          a brand new pack always wants filling, whatever version the world records.
 */
export async function ensureItemCompendium() {
  if (!game.user.isGM) return { pack: null, created: false };

  const existing = game.packs.get(packId());
  if (existing) return { pack: existing, created: false };

  const { name, label } = LOBIA.itemPack;
  log(`compendium "${packId()}" not found — creating it`);
  try {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      name, label, type: "Item"
    });
    if (!pack) throw new Error("createCompendium returned nothing");
    log(`created compendium "${pack.collection}"`);
    ui.notifications.info(game.i18n.format("LOBIA.Item.packCreated", { label }));
    return { pack, created: true };
  } catch (err) {
    // Loud on purpose: a silent failure here used to look like "nothing happened".
    console.error("Lobia | Could not create the item compendium", err);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: err.message }));
    return { pack: null, created: false };
  }
}

/**
 * Make sure the pack holds one folder per big category, each containing a folder per
 * sub-category, and return a map of sub-category key -> folder id.
 *
 * Folders are matched by a `lobia.key` flag rather than by name, so a GM who renames
 * or recolours a folder keeps it instead of getting a duplicate on the next import.
 * Only sub-categories that actually hold items get a folder — no empty shelves.
 *
 * @param {CompendiumCollection} pack
 * @param {Iterable<string>} subKeys  Sub-categories that need a home.
 * @returns {Promise<Map<string, string>>}
 */
export async function ensureFolders(pack, subKeys) {
  const wanted = new Set(subKeys);
  const byKey = new Map();
  for (const folder of pack.folders) {
    const key = folder.getFlag("lobia", "key");
    if (key) byKey.set(key, folder);
  }

  // Pass 1: categories with items (including GM-defined shelves).
  const categories = itemTaxonomy()
    .map((cat, i) => ({ cat, i, subs: cat.subs.map(s => `${cat.key}-${s}`).filter(k => wanted.has(k)) }))
    .filter(entry => entry.subs.length > 0);

  const newCategories = categories
    .filter(({ cat }) => !byKey.has(cat.key))
    .map(({ cat, i }) => ({
      name: itemCategoryName(cat.key),
      type: "Item",
      color: cat.color,
      sorting: "m",
      sort: (i + 1) * 100000,
      folder: null,
      flags: { lobia: { key: cat.key } }
    }));
  if (newCategories.length) {
    log(`creating ${newCategories.length} category folders`);
    for (const folder of await Folder.implementation.createDocuments(newCategories, { pack: pack.collection })) {
      byKey.set(folder.getFlag("lobia", "key"), folder);
    }
  }

  // Pass 2: the sub-categories, parented to the folders that now exist.
  const newSubs = [];
  for (const { cat, subs } of categories) {
    const parent = byKey.get(cat.key);
    if (!parent) continue;
    subs.forEach((subKey, j) => {
      if (byKey.has(subKey)) return;
      newSubs.push({
        name: itemSubcategoryName(subKey),
        type: "Item",
        color: cat.color,
        sorting: "m",
        sort: (j + 1) * 1000,
        folder: parent.id,
        flags: { lobia: { key: subKey } }
      });
    });
  }
  if (newSubs.length) {
    log(`creating ${newSubs.length} sub-category folders`);
    for (const folder of await Folder.implementation.createDocuments(newSubs, { pack: pack.collection })) {
      byKey.set(folder.getFlag("lobia", "key"), folder);
    }
  }

  const map = new Map();
  for (const key of wanted) {
    const folder = byKey.get(key);
    if (folder) map.set(key, folder.id);
  }
  return map;
}

/**
 * Import catalogue entries into the item compendium.
 * Each entry is the four pieces of data every Lobia item carries, plus its filing:
 * `{ name, subcategory, price, description }`.
 *
 * Entries are matched on **name + sub-category**, so re-running after the source
 * spreadsheet changes updates in place instead of duplicating — and two items that
 * legitimately share a name in different sub-categories both survive.
 *
 * @param {Array<object>} [entries=ITEM_CATALOGUE]
 * @param {object} [options]
 * @param {boolean} [options.replace=false]  Empty the pack first instead of merging.
 * @returns {Promise<{created: number, updated: number, skipped: string[]}>}
 */
export async function importItems(entries = ITEM_CATALOGUE, { replace = false } = {}) {
  const { pack } = await ensureItemCompendium();
  if (!pack) throw new Error("Lobia | The item compendium is not available");
  if (pack.locked) await pack.configure({ locked: false });

  const skipped = [];
  const clean = entries.map(e => {
    const known = ITEM_SUBCATEGORIES[e.subcategory];
    if (!known) skipped.push(`${e.name} (${e.subcategory})`);
    return {
      name: String(e.name ?? "").trim(),
      type: "objet",
      system: {
        subcategory: known ? e.subcategory : DEFAULT_SUBCATEGORY,
        price: Number.isFinite(Number(e.price)) ? Math.max(0, Math.trunc(Number(e.price))) : 0,
        description: String(e.description ?? "").trim()
      }
    };
  }).filter(e => e.name);

  if (replace) {
    const ids = (await pack.getIndex()).map(i => i._id);
    if (ids.length) {
      log(`replacing: deleting ${ids.length} existing items`);
      await Item.implementation.deleteDocuments(ids, { pack: pack.collection });
    }
  }

  const folderFor = await ensureFolders(pack, new Set(clean.map(e => e.system.subcategory)));

  const index = await pack.getIndex({ fields: ["system.subcategory", "folder"] });
  const key = (name, subcategory) => `${name}\u0000${subcategory}`;
  const existing = new Map(index.map(i => [key(i.name, i.system?.subcategory), i]));

  const toCreate = clean
    .filter(e => !existing.has(key(e.name, e.system.subcategory)))
    .map(e => ({ ...e, folder: folderFor.get(e.system.subcategory) ?? null }));

  // On update, only file an item that is not already in a folder — a GM who moved
  // something into their own folder keeps it.
  const toUpdate = clean
    .filter(e => existing.has(key(e.name, e.system.subcategory)))
    .map(e => {
      const entry = existing.get(key(e.name, e.system.subcategory));
      const update = { _id: entry._id, ...e };
      if (!entry.folder) update.folder = folderFor.get(e.system.subcategory) ?? null;
      return update;
    });

  if (toCreate.length) await Item.implementation.createDocuments(toCreate, { pack: pack.collection });
  if (toUpdate.length) await Item.implementation.updateDocuments(toUpdate, { pack: pack.collection });

  log(`import done — ${toCreate.length} created, ${toUpdate.length} updated, ${skipped.length} skipped`);
  return { created: toCreate.length, updated: toUpdate.length, skipped };
}

/**
 * Bring the world's item compendium up to date. Called once on `ready`, and callable
 * by hand from a macro or the console as `game.lobia.setupItems()`.
 *
 * Creates the pack if it is missing, then imports the catalogue when the pack is empty
 * or when this world has not yet seen this CATALOGUE_VERSION. A GM who has emptied a
 * pack that is already at the current version is left alone.
 *
 * @param {object} [options]
 * @param {boolean} [options.force=false]  Import regardless of version/contents.
 * @returns {Promise<void>}
 */
export async function setupItemCompendium({ force = false } = {}) {
  if (!game.user.isGM) return;

  const { pack, created } = await ensureItemCompendium();
  if (!pack) return;   // ensureItemCompendium already reported why

  // Empty shelves for the new system categories must exist even without workbook entries.
  await ensureFolders(pack, ["objets-tenus-general", "equipement-armure", "equipement-vetement", "baies-general"]);

  const seen = game.settings.get("lobia", "catalogueVersion") ?? 0;
  const size = (await pack.getIndex()).size;

  // A pack we just created is always filled, even if this world imported before —
  // that is exactly the "deleted it and reloaded" case.
  if (!force && !created && (seen >= CATALOGUE_VERSION)) {
    if (size > 0) log(`compendium up to date (v${seen}, ${size} items) — nothing to import`);
    else log(`compendium is empty but already at v${seen} — leaving it alone `
      + "(run game.lobia.setupItems({force: true}) to refill it)");
    return;
  }

  log(`importing catalogue v${CATALOGUE_VERSION} (${ITEM_CATALOGUE.length} items, world at v${seen}, pack holds ${size})`);
  try {
    const { created, updated, skipped } = await importItems(ITEM_CATALOGUE);
    if (skipped.length) console.warn("Lobia | Items with an unknown sub-category:", skipped);
    await game.settings.set("lobia", "catalogueVersion", CATALOGUE_VERSION);
    ui.notifications.info(game.i18n.format("LOBIA.Item.packFilled", {
      count: created + updated, label: LOBIA.itemPack.label
    }));
  } catch (err) {
    console.error("Lobia | Could not import the item catalogue", err);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: err.message }));
  }
}
