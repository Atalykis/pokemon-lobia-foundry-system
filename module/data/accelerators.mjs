/** Effects keyed by the names in the Objets compendium. Only these are consumable accelerators. */
export const ACCELERATORS = Object.freeze({
  "PV Plus": { hp: true },
  "Protéine": { stat: "attaque", amount: 5 },
  "Calcium": { stat: "attaqueSpeciale", amount: 5 },
  "Fer": { stat: "defense", amount: 5 },
  "Zinc": { stat: "defenseSpeciale", amount: 5 },
  "Carbone": { stat: "vitesse", amount: 5 },
  "Boost Physique": { derived: "physique", amount: 2 },
  "Boost Spécial": { derived: "special", amount: 2 },
  "Boost Armure": { derived: "armure", amount: 1 },
  "Boost Barrière": { derived: "barriere", amount: 1 },
  "Boost Initiative": { derived: "initiative", amount: 2 },
  "PP Plus": { point: true },
  "PP Max": { move: true }
});

export const acceleratorEffect = item => item?.type === "objet"
  && item.system?.subcategory === "bonus-accelerateur" ? ACCELERATORS[item.name] ?? null : null;

export function ppMaxMoveKeys(accelerators) {
  return new Set(Object.values(accelerators ?? {}).filter(entry => entry?.name === "PP Max" && entry.moveKey)
    .map(entry => entry.moveKey));
}
