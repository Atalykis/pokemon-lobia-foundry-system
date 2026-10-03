/** Accept saved dice-only values and old Pokédex formulas during migration. */
export function pokemonHpDice(hpFormula) {
  const text = String(hpFormula ?? "").trim();
  const match = /^(\d+)\s*[dD]\s*(\d+)$/i.exec(text)
    ?? /^\d+\s*\+\s*Niv\s*\(\s*(\d+)\s*[dD]\s*(\d+)\s*\)$/i.exec(text);
  if (!match) return null;
  const count = Number(match[1]);
  const faces = Number(match[2]);
  return count >= 1 && count <= 100 && faces >= 2 && faces <= 1000
    ? `${count}d${faces}` : null;
}

export const isPokemonHpBonus = label => /^PV\s*\+$/i.test(String(label ?? "").trim());
