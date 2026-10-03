import { POKEDEX_SPECIES, POKEDEX_FAMILIES } from "./pokemon-pokedex.mjs";

/** Workbook topology: ten paid cells per branch, seven alternating single/split rows. */
export const POKEMON_TREE_ROWS = [
  ["root"], ["a1", "b1"], ["mid1"], ["a2", "b2"],
  ["mid2"], ["a3", "b3"], ["end"]
];

export const POKEMON_TREE_NODES = {
  root: { parents: [], cost: 1 },
  a1: { parents: ["root"], cost: 1 }, b1: { parents: ["root"], cost: 1 },
  mid1: { parents: ["a1", "b1"], cost: 1 },
  a2: { parents: ["mid1"], cost: 1 }, b2: { parents: ["mid1"], cost: 1 },
  mid2: { parents: ["a2", "b2"], cost: 1 },
  a3: { parents: ["mid2"], cost: 1 }, b3: { parents: ["mid2"], cost: 1 },
  end: { parents: ["a3", "b3"], cost: 1 }
};

const normalize = name => String(name ?? "").toLocaleLowerCase("fr").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
const formReference = value => normalize(value).replaceAll("degalar", "galar")
  .replaceAll("dhisui", "hisui").replaceAll("dalola", "alola");
const keyFor = name => {
  const key = normalize(name);
  if (key === "bekaglacontetedegel") {
    return /tête de gel/i.test(name) ? "bekaglacon-tete-de-gel" : "bekaglacon-tete-degel";
  }
  return key;
};

const familyPaths = new Map();

/** The source's evolution remarks identify forks; unnamed evolutions go to the next form. */
function evolutionPaths(familyId) {
  if (familyPaths.has(familyId)) return familyPaths.get(familyId);
  const members = POKEDEX_FAMILIES[familyId].members;
  const parents = new Map(members.map(name => [name, []]));
  let branching = false;
  for (let index = 0; index < members.length - 1; index++) {
    const from = members[index];
    const evolution = POKEDEX_SPECIES[keyFor(from)]?.evolution ?? "";
    if (!evolution || /^aucune\b/i.test(evolution)) continue;
    const text = formReference(evolution);
    let targets = members.slice(index + 1).filter(name => text.includes(formReference(name)));
    if (!targets.length) targets = [members[index + 1]];
    if (targets.length > 1) branching = true;
    for (const target of targets) parents.get(target).push(from);
  }
  const ancestors = new Map(members.map(name => {
    const path = new Set([name]);
    const pending = [...parents.get(name)];
    while (pending.length) {
      const parent = pending.pop();
      if (path.has(parent)) continue;
      path.add(parent);
      pending.push(...parents.get(parent));
    }
    return [name, path];
  }));
  const result = { branching, ancestors };
  familyPaths.set(familyId, result);
  return result;
}

/** Trees with an explicit evolution-only root belong to that path; neutral roots are shared. */
export function pokemonTreeProfile(name) {
  const species = POKEDEX_SPECIES[keyFor(name)];
  if (species) {
    const family = POKEDEX_FAMILIES[species.family];
    const paths = evolutionPaths(species.family);
    return { name: species.name, members: family.members, familyId: species.family,
      stage: family.members.indexOf(species.name),
      branches: paths.branching
        ? family.branches.filter(branch => !branch.requiredSpecies?.length
          || branch.requiredSpecies.some(required => paths.ancestors.get(species.name).has(required)))
        : family.branches };
  }
  return {
    name: "", members: [], stage: 0,
    branches: Array.from({ length: 4 }, (_, index) => ({
      id: `placeholder-${index + 1}`, species: "",
      labels: Object.fromEntries(Object.keys(POKEMON_TREE_NODES).map(id => [id, "—"]))
    }))
  };
}

/** Only explicit numeric bonus labels are automated. Moves and PV + await their rules. */
export function pokemonTreeBonus(label) {
  return {
    "Déplacement +": { battle: "deplacement", amount: 1 },
    "Action +": { battle: "action", amount: 1 },
    "Action bonus +": { battle: "actionBonus", amount: 1 },
    "Actionbonus +": { battle: "actionBonus", amount: 1 },
    "Acton bonus +": { battle: "actionBonus", amount: 1 },
    "Réaction +": { battle: "reaction", amount: 1 },
    "Réaction+": { battle: "reaction", amount: 1 },
    "Réacion +": { battle: "reaction", amount: 1 },
    "Physique +": { derived: "physique", amount: 2 },
    "Spécial +": { derived: "special", amount: 2 },
    "Initiative +": { derived: "initiative", amount: 2 },
    "Armure +": { derived: "armure", amount: 1 },
    "Barrière +": { derived: "barriere", amount: 1 },
    "Barruère +": { derived: "barriere", amount: 1 },
    "Spéciale +": { derived: "special", amount: 2 }
  }[label] ?? null;
}

export function pokemonTreeLabel(profile, branch, nodeId) {
  const alternate = branch.alternateLabels?.[nodeId];
  return alternate && alternate.species === profile.name ? alternate.label : branch.labels[nodeId];
}

/** Determine actual ancestry, avoiding accidental access to sibling evolutions. */
function evolvedFrom(profile, required) {
  return profile.familyId && evolutionPaths(profile.familyId).ancestors.get(profile.name)?.has(required);
}

function permitted(rule, profile, level) {
  if (!rule) return true;
  // Workbook level caps are phrased for the family's first form; evolved Pokémon bypass them.
  if (profile.stage === 0 && (rule.minLevel ?? 0) > level) return false;
  if (rule.requiresEvolution && profile.stage === 0) return false;
  if (rule.requiredSpecies?.length
    && !rule.requiredSpecies.some(name => evolvedFrom(profile, name))) return false;
  return true;
}

export function pokemonBranchOpen(profile, branch, level) {
  if (branch.divisionRole && !profile.selectedDivisionRoles?.includes(branch.divisionRole)) return false;
  if (branch.custom) {
    if (branch.conditionType === "level") {
      const required = Number(branch.conditionLevel);
      if (!Number.isInteger(required) || required < 1 || required > 20 || level < required) return false;
    }
    if (branch.conditionType === "evolution") {
      if (!normalize(branch.conditionSpecies) || normalize(profile.name) !== normalize(branch.conditionSpecies)) return false;
    }
  }
  return permitted(branch, profile, level);
}

export function pokemonNodeOpen(profile, branch, nodeId, level) {
  return pokemonBranchOpen(profile, branch, level)
    && permitted(branch.nodeRestrictions?.[nodeId], profile, level);
}
