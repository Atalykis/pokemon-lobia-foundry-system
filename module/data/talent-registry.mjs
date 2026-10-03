import { TALENT_CATALOGUE, TALENT_CATEGORIES } from "../packs/talents-data.mjs";

let talents = null;
let categories = null;
let byKey = null;

export const getTalents = () => talents ?? TALENT_CATALOGUE;
export const getTalentCategories = () => categories ?? TALENT_CATEGORIES;
export function getTalent(key) {
  if (!key) return null;
  return (byKey ?? new Map(TALENT_CATALOGUE.map(t => [t.key, t]))).get(key) ?? null;
}

export function setTalentRegistry(docs, folders = []) {
  const order = new Map(TALENT_CATEGORIES.map((c, i) => [c.key, i]));
  categories = TALENT_CATEGORIES.map(c => {
    const folder = folders.find(f => f.getFlag("lobia", "key") === `talent-category-${c.key}`);
    return folder ? { key: c.key, name: folder.name, description: folder.description } : c;
  });
  talents = docs.filter(doc => doc.type === "talent").map(doc => ({
    key: doc.system.key, category: doc.system.category,
    name: doc.name, effect: doc.system.effect, sort: doc.sort ?? 0
  })).filter(t => t.key);
  talents.sort((a, b) => (order.get(a.category) ?? 999) - (order.get(b.category) ?? 999)
    || a.sort - b.sort || a.name.localeCompare(b.name));
  byKey = new Map();
  for (const talent of talents) {
    if (byKey.has(talent.key)) console.warn(`Lobia | Duplicate Pokémon Talent key "${talent.key}"`);
    else byKey.set(talent.key, talent);
  }
}

export function resetTalentRegistry() { talents = null; categories = null; byKey = null; }

/** Resolve pre-catalogue free-text slot names without losing custom GM values. */
export function legacyTalentKey(value) {
  if (!value) return "";
  const text = String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return TALENT_CATALOGUE.find(t => t.key === text)?.key ?? value;
}
