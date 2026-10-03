import { POKEMON_NATURES } from "./pokemon-natures.mjs";

const statKeys = ["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"];

function bundledNatures() {
  return POKEMON_NATURES.map(([key, effects], index) => ({
    key, name: game.i18n.localize(`LOBIA.Nature.${key}`),
    min: index * 4 + 1, max: index * 4 + 4,
    effects: Object.fromEntries(statKeys.map(stat => [stat, effects[stat] ?? 0]))
  }));
}

let natures = null;
let byKey = null;

function list() {
  return natures ?? bundledNatures();
}

export function getNatures() { return list(); }
export function getNature(key) { return (byKey ?? new Map(list().map(nature => [nature.key, nature]))).get(key) ?? null; }

/** A GM's partial or emptied pack is authoritative; never resurrect deleted Natures. */
export function setNatureRegistry(documents) {
  natures = documents.map(doc => ({
    key: doc.system.key,
    name: doc.name,
    min: doc.system.min,
    max: doc.system.max,
    effects: Object.fromEntries(statKeys.map(stat => [stat, doc.system.effects?.[stat] ?? 0]))
  })).filter(nature => nature.key);
  natures.sort((a, b) => (a.min - b.min) || a.key.localeCompare(b.key));
  byKey = new Map();
  for (const nature of natures) {
    if (byKey.has(nature.key)) console.warn(`Lobia | Duplicate Pokémon Nature key "${nature.key}"`);
    else byKey.set(nature.key, nature);
  }
  for (let i = 1; i < natures.length; i++) {
    if (natures[i].min <= natures[i - 1].max) {
      console.warn(`Lobia | Overlapping Nature roll ranges: ${natures[i - 1].key} / ${natures[i].key}`);
    }
  }
}

export function resetNatureRegistry() { natures = null; byKey = null; }

export function natureForRoll(result) {
  if (!Number.isInteger(result) || result < 1 || result > 100) throw new RangeError("Nature roll must be 1–100");
  return list().find(nature => result >= nature.min && result <= nature.max) ?? null;
}
