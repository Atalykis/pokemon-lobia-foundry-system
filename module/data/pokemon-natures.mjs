/** Nature table: each entry covers four consecutive results on 1d100. */
export const POKEMON_NATURES = [
  ["assure", { attaque: -10, defense: 10 }],
  ["bizarre", {}],
  ["brave", { attaque: 10, vitesse: -10 }],
  ["calme", { attaque: -10, defenseSpeciale: 10 }],
  ["discret", { attaqueSpeciale: 10, vitesse: -10 }],
  ["docile", {}],
  ["doux", { defense: -10, attaqueSpeciale: 10 }],
  ["foufou", { attaqueSpeciale: 10, defenseSpeciale: -10 }],
  ["gentil", { defense: -10, defenseSpeciale: 10 }],
  ["hardi", {}],
  ["jovial", { attaqueSpeciale: -10, vitesse: 10 }],
  ["lache", { defense: 10, defenseSpeciale: -10 }],
  ["malin", { defense: 10, attaqueSpeciale: -10 }],
  ["malpoli", { defenseSpeciale: 10, vitesse: -10 }],
  ["mauvais", { attaque: 10, defenseSpeciale: -10 }],
  ["modeste", { attaque: -10, attaqueSpeciale: 10 }],
  ["naif", { defenseSpeciale: -10, vitesse: 10 }],
  ["presse", { defense: -10, vitesse: 10 }],
  ["prudent", { attaqueSpeciale: -10, defenseSpeciale: 10 }],
  ["pudique", {}],
  ["relax", { defense: 10, vitesse: -10 }],
  ["rigide", { attaque: 10, attaqueSpeciale: -10 }],
  ["serieux", {}],
  ["solo", { attaque: 10, defense: -10 }],
  ["timide", { attaque: -10, vitesse: 10 }]
];

/** One roll determines both measurements; do not round the dice multiplier itself. */
export function measurementsForRoll(result, averageSize, averageWeight) {
  if (!Number.isInteger(result) || result < 1 || result > 100) throw new RangeError("Size roll must be 1–100");
  const factor = result / 100 + 0.5;
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  return { size: round(factor * averageSize), weight: round(factor * averageWeight) };
}
