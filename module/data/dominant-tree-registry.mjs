import { POKEMON_DOMINANT_TREES } from "./pokemon-dominant-data.mjs";

// A missing pack uses the bundled workbook; an existing pack (even an empty one)
// is authoritative, so deleting an entry really removes that type's tree.
let trees = null;

export function getDominantTree(type) {
  return (trees ?? POKEMON_DOMINANT_TREES)[type] ?? null;
}

export function setDominantTrees(documents) {
  trees = {};
  for (const doc of documents) {
    const type = doc.system.type;
    if (Object.hasOwn(trees, type)) {
      console.warn(`Lobia | Duplicate Dominant tree for ${type}`);
      continue;
    }
    trees[type] = { labels: { ...doc.system.labels }, notes: { ...doc.system.notes } };
  }
}

export function resetDominantTrees() { trees = null; }
