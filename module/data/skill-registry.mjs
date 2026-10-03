import { SKILLS_BY_TYPE as BUNDLED_SKILLS } from "./skills-data.mjs";
import { TREE_LABELS as BUNDLED_LABELS } from "./trees-data.mjs";

/**
 * Where the trainer sheet and the trainer data model read skills and tree labels from.
 *
 * Actor data preparation is synchronous and runs constantly, so the compendium is read
 * **once** into this in-memory registry and refreshed when the GM edits it — never
 * queried during a render.
 *
 * Until the compendium is loaded (and if it is missing or empty) the bundled data
 * generated from the source xlsx is used, so the system always works out of the box.
 * A category is taken from the compendium wholesale as soon as it holds anything of
 * that kind: partial per-type fallback would silently resurrect deleted entries.
 */
const registry = {
  skillsByType: BUNDLED_SKILLS,
  skillsByKey: new Map(Object.values(BUNDLED_SKILLS).flat().map(skill => [skill.key, skill])),
  labels: BUNDLED_LABELS,
  source: { skills: "bundled", labels: "bundled" }
};

/** Skills of one type, in catalogue order. */
export function getSkills(type) {
  return registry.skillsByType[type] ?? [];
}

/** One skill by its stable key. */
export function getSkill(key) {
  return registry.skillsByKey.get(key) ?? null;
}

/** The six bonus labels of one type's tree. */
export function getTreeLabels(type) {
  return registry.labels[type] ?? {};
}

/** Which source each half of the registry currently comes from. */
export function registrySource() {
  return { ...registry.source };
}

/** Reset to the data bundled with the system. */
export function resetRegistry() {
  registry.skillsByType = BUNDLED_SKILLS;
  registry.skillsByKey = new Map(Object.values(BUNDLED_SKILLS).flat().map(skill => [skill.key, skill]));
  registry.labels = BUNDLED_LABELS;
  registry.source = { skills: "bundled", labels: "bundled" };
}

/**
 * Rebuild the registry from a compendium's documents.
 * @param {Array<Item>} docs  Items of type "competence" and/or "arbre".
 * @returns {{skills: number, trees: number}} How many of each were adopted.
 */
export function setRegistryFromDocuments(docs) {
  const skillsByType = {};
  const labels = {};
  let skills = 0;
  let trees = 0;

  for (const doc of docs) {
    if (doc.type === "competence") {
      const sys = doc.system;
      const skill = {
        key: sys.key,
        type: sys.type,
        category: sys.category,
        name: doc.name,
        sort: doc.sort ?? 0,
        tiers: { 1: sys.tiers[1], 2: sys.tiers[2], 3: sys.tiers[3] }
      };
      (skillsByType[sys.type] ||= []).push(skill);
      skills++;
    } else if (doc.type === "arbre") {
      labels[doc.system.type] = { ...doc.system.labels };
      trees++;
    }
  }

  // Keep the GM-controlled compendium order within each type.
  for (const list of Object.values(skillsByType)) {
    list.sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name, game.i18n.lang));
  }

  if (skills > 0) {
    registry.skillsByType = skillsByType;
    registry.skillsByKey = new Map();
    for (const skill of Object.values(skillsByType).flat()) {
      if (registry.skillsByKey.has(skill.key)) {
        console.warn(`Lobia | Duplicate Trainer skill key "${skill.key}" in the compendium`);
        continue;
      }
      registry.skillsByKey.set(skill.key, skill);
    }
    registry.source.skills = "compendium";
  }
  if (trees > 0) {
    registry.labels = labels;
    registry.source.labels = "compendium";
  }
  return { skills, trees };
}
