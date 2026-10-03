/** Stance bonuses are prepared, never written into a stat's stored base or modifier. */
export const COMBAT_STYLES = {
  neutre: { stats: {}, dealt: 1, received: 1, area: false, immuneStat: false, turnOnly: false },
  devastateur: { stats: { attaque: -25, attaqueSpeciale: -25 }, dealt: 1, received: 1,
    area: true, immuneStat: false, turnOnly: true },
  puissant: { stats: {}, dealt: 2, received: 2, area: false, immuneStat: false, turnOnly: false },
  rapide: { stats: { attaque: 25, attaqueSpeciale: 25, defense: -25, defenseSpeciale: -25 },
    dealt: 1, received: 1, area: false, immuneStat: false, turnOnly: true },
  defensif: { stats: {}, dealt: 0.5, received: 1, area: false, immuneStat: true, turnOnly: false }
};

export const combatStyleEffects = style => COMBAT_STYLES[style] ?? COMBAT_STYLES.neutre;

/** Apply outgoing damage rules to an already validated dice formula. */
export function combatStyleDamageFormula(formula, style) {
  const multiplier = combatStyleEffects(style).dealt;
  if (multiplier === 2) return `(${formula})*2`;
  if (multiplier === 0.5) return `floor((${formula})/2)`;
  return formula;
}
