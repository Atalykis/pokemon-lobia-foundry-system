import { POKEDEX_SPECIES } from "./pokemon-pokedex.mjs";
import { pokemonHpDice } from "./pokemon-hp.mjs";

const normalize = name => String(name ?? "").toLocaleLowerCase("fr").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
const keyFor = name => {
  const key = normalize(name);
  if (key === "bekaglacontetedegel") {
    return /tête de gel/i.test(name) ? "bekaglacon-tete-de-gel" : "bekaglacon-tete-degel";
  }
  return key;
};

export function pokemonSpecies(name) {
  return POKEDEX_SPECIES[keyFor(name)] ?? null;
}

/** Baseline data copied into the bundled compendium, not into captured world copies. */
export function pokemonTemplateUpdates(species) {
  const updates = {};
  updates["system.identity.averageSize"] = species.averageSize;
  updates["system.identity.averageWeight"] = species.averageWeight;
  updates["system.type.primary"] = species.types[0];
  updates["system.type.secondary"] = species.types[1];
  for (const [key, base] of Object.entries(species.stats)) {
    updates[`system.stats.${key}.base`] = base;
    updates[`system.stats.${key}.mod`] = 0;
  }
  for (const [key, max] of Object.entries(species.battle)) {
    updates[`system.battle.${key}.max`] = max;
    updates[`system.battle.${key}.value`] = max;
  }
  for (const [index, slot] of ["first", "second", "third"].entries()) {
    updates[`system.talents.${slot}`] = species.talents[index];
  }
  updates["system.hp.base"] = species.hpBase;
  updates["system.hp.value"] = species.hpBase;
  for (const [key, value] of Object.entries({
    level: 0, size: 0, weight: 0, sizeRoll: 0, shinyRoll: 0,
    nature: "", natureRolled: false, sex: species.sex.male + species.sex.female === 0 ? "none" : "",
    shiny: false, dominant: false
  })) updates[`system.identity.${key}`] = value;
  updates["system.talents.selected"] = "";
  updates["system.dominantType"] = "";
  for (const [key, value] of Object.entries({
    name: species.name,
    evolution: species.evolution,
    hpFormula: pokemonHpDice(species.hpFormula) ?? "",
    evolutionHp: species.evolutionHp ?? "",
    malePercent: species.sex.male,
    femalePercent: species.sex.female
  })) updates[`system.species.${key}`] = value;
  return updates;
}
