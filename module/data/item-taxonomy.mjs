/**
 * The item catalogue's two-level taxonomy. Imported catalogue categories are
 * supplemented by inventory-only shelves and GM-defined world categories.
 *
 * Sub-category keys are globally unique (`<category>-<sub>`) so an item only ever
 * stores `system.subcategory` — its big category is derived from it, which makes an
 * inconsistent pair impossible.
 */
export const ITEM_TAXONOMY = [
  {
    key: "pokeball",
    icon: "fa-circle-dot",
    color: "#7ba7b0",
    subs: ["standard", "poids", "speciale", "illegale"]
  },
  {
    key: "bonus",
    icon: "fa-kit-medical",
    color: "#7aa86a",
    subs: ["soin", "combat", "accelerateur", "plumes"]
  },
  {
    key: "arme",
    icon: "fa-gun",
    color: "#d08a4e",
    // "medieval"/"armure" are the two extra sections the source spreadsheet carries
    // beyond the six weapon families.
    subs: ["knocker", "shooter", "slasher", "blocker", "healer", "modificateur", "medieval", "armure"]
  },
  {
    key: "accessoire",
    icon: "fa-link",
    color: "#9b8ec4",
    subs: ["boost", "power", "meteo", "special"]
  },
  {
    key: "recharge",
    icon: "fa-bolt",
    color: "#c9a227",
    subs: ["standard", "statut"]
  },
  {
    key: "objets-tenus",
    icon: "fa-hand-holding",
    color: "#b99978",
    subs: ["general"]
  },
  {
    key: "equipement",
    icon: "fa-shirt",
    color: "#8f9ba7",
    subs: ["armure", "vetement"]
  },
  {
    key: "baies",
    icon: "fa-seedling",
    color: "#bd7385",
    subs: ["general"]
  }
];

/** Big category key -> its definition. */
export const ITEM_CATEGORIES = Object.fromEntries(ITEM_TAXONOMY.map(c => [c.key, c]));

/**
 * Flat map of every sub-category key -> { key, category, sub }.
 * @type {Record<string, {key: string, category: string, sub: string}>}
 */
export const ITEM_SUBCATEGORIES = Object.fromEntries(
  ITEM_TAXONOMY.flatMap(c => c.subs.map(sub => {
    const key = `${c.key}-${sub}`;
    return [key, { key, category: c.key, sub }];
  }))
);

/** Every sub-category key, in catalogue order. */
export const SUBCATEGORY_KEYS = Object.keys(ITEM_SUBCATEGORIES);

/** The default sub-category for a freshly created item. */
export const DEFAULT_SUBCATEGORY = "bonus-soin";

/** GM-defined world categories each have one uncapped inventory bucket. */
export function customItemCategories() {
  return globalThis.game?.settings?.get?.("lobia", "customItemCategories") ?? [];
}

/** World-wide display names; category and sub-category keys never change. */
export function itemCategoryLabels() {
  return globalThis.game?.settings?.get?.("lobia", "itemCategoryLabels") ?? {};
}

/** World additions and removed built-in subcategories. */
export function itemCategorySubcategories() {
  return globalThis.game?.settings?.get?.("lobia", "itemCategorySubcategories") ?? {};
}

export function itemTaxonomy() {
  const settings = itemCategorySubcategories();
  return [...ITEM_TAXONOMY, ...customItemCategories().map(({ key, name }) => ({
    key, name, icon: "fa-box", subs: ["general"]
  }))].map(cat => ({ ...cat, subs: [
    ...cat.subs.filter(sub => !settings.hidden?.includes(`${cat.key}-${sub}`)),
    ...(settings.added?.[cat.key] ?? []).map(entry => entry.key)
  ] }));
}

export function itemCategoryName(key) {
  return itemCategoryLabels().categories?.[key]
    ?? customItemCategories().find(c => c.key === key)?.name
    ?? game.i18n.localize(categoryLabelKey(key));
}

export function itemSubcategoryName(key) {
  const custom = customItemCategories().find(c => `${c.key}-general` === key);
  const added = Object.entries(itemCategorySubcategories().added ?? {})
    .flatMap(([category, entries]) => entries.map(entry => ({ ...entry, category })))
    .find(entry => `${entry.category}-${entry.key}` === key);
  return itemCategoryLabels().subcategories?.[key]
    ?? added?.name ?? (custom ? custom.name : game.i18n.localize(subcategoryLabelKey(key)));
}

/**
 * The big category a sub-category belongs to.
 * @param {string} subcategory
 * @returns {string|null}
 */
export function categoryOf(subcategory) {
  return itemTaxonomy().find(category => category.subs.some(sub => `${category.key}-${sub}` === subcategory))?.key ?? null;
}

/** i18n key for a big category label. */
export function categoryLabelKey(category) {
  return `LOBIA.Item.Category.${category}`;
}

/** i18n key for a sub-category label. */
export function subcategoryLabelKey(subcategory) {
  return `LOBIA.Item.Sub.${subcategory}`;
}
