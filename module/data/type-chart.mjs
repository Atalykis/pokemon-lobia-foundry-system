/**
 * Pokémon type effectiveness (Gen 6+), keyed by ATTACKING type.
 * `se` = super effective (×2), `nve` = not very effective (×0.5), `immune` = no effect (×0)
 * against the listed DEFENDING types. Any type not listed is neutral (×1).
 */
export const TYPE_EFFECT = {
  normal:   { se: [], nve: ["roche", "acier"], immune: ["spectre"] },
  feu:      { se: ["plante", "glace", "insecte", "acier"], nve: ["feu", "eau", "roche", "dragon"], immune: [] },
  eau:      { se: ["feu", "sol", "roche"], nve: ["eau", "plante", "dragon"], immune: [] },
  plante:   { se: ["eau", "sol", "roche"], nve: ["feu", "plante", "poison", "vol", "insecte", "dragon", "acier"], immune: [] },
  electrik: { se: ["eau", "vol"], nve: ["electrik", "plante", "dragon"], immune: ["sol"] },
  glace:    { se: ["plante", "sol", "vol", "dragon"], nve: ["feu", "eau", "glace", "acier"], immune: [] },
  combat:   { se: ["normal", "glace", "roche", "tenebres", "acier"], nve: ["poison", "vol", "psy", "insecte", "fee"], immune: ["spectre"] },
  poison:   { se: ["plante", "fee"], nve: ["poison", "sol", "roche", "spectre"], immune: ["acier"] },
  sol:      { se: ["feu", "electrik", "poison", "roche", "acier"], nve: ["plante", "insecte"], immune: ["vol"] },
  vol:      { se: ["plante", "combat", "insecte"], nve: ["electrik", "roche", "acier"], immune: [] },
  psy:      { se: ["combat", "poison"], nve: ["psy", "acier"], immune: ["tenebres"] },
  insecte:  { se: ["plante", "psy", "tenebres"], nve: ["feu", "combat", "poison", "vol", "spectre", "acier", "fee"], immune: [] },
  roche:    { se: ["feu", "glace", "vol", "insecte"], nve: ["combat", "sol", "acier"], immune: [] },
  spectre:  { se: ["psy", "spectre"], nve: ["tenebres"], immune: ["normal"] },
  dragon:   { se: ["dragon"], nve: ["acier"], immune: ["fee"] },
  tenebres: { se: ["psy", "spectre"], nve: ["combat", "tenebres", "fee"], immune: [] },
  acier:    { se: ["glace", "roche", "fee"], nve: ["feu", "eau", "electrik", "acier"], immune: [] },
  fee:      { se: ["combat", "dragon", "tenebres"], nve: ["feu", "poison", "acier"], immune: [] }
};

/** Damage multiplier an `attacker`-type move deals to a single `defender` type. */
export function attackMultiplier(attacker, defender) {
  const e = TYPE_EFFECT[attacker];
  if (!e) return 1;
  if (e.immune.includes(defender)) return 0;
  if (e.se.includes(defender)) return 2;
  if (e.nve.includes(defender)) return 0.5;
  return 1;
}

/**
 * Compute the defensive multiplier against every attacking type for a defender
 * with the given (1 or 2) types.
 * @param {string[]} defTypes  Defending type keys (blanks ignored).
 * @returns {Record<string, number>}  attacking type key -> total multiplier
 */
export function defensiveProfile(defTypes) {
  const types = defTypes.filter(Boolean);
  const result = {};
  for (const atk of Object.keys(TYPE_EFFECT)) {
    let m = 1;
    for (const d of types) m *= attackMultiplier(atk, d);
    result[atk] = m;
  }
  return result;
}
