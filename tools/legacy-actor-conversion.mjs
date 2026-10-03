/** Pure conversion of a legacy Simple World-Building Actor source. No database I/O. */
const STATS = {
  attaque: "attaque", attaqueSpeciale: "attaqueSpe", defense: "defense",
  defenseSpeciale: "defenseSpe", vitesse: "vitesse",
  charisme: "charisme", discretion: "discrétion", talent: "talent", connaissance: "connaissance"
};
export const TYPE_KEYS = {
  Acier: "acier", Combat: "combat", Dragon: "dragon", Eau: "eau",
  Electrique: "electrik", Électrique: "electrik", Fée: "fee", Feu: "feu",
  Glace: "glace", Insecte: "insecte", Normal: "normal", Plante: "plante",
  Poison: "poison", Psy: "psy", Roche: "roche", Sol: "sol",
  Spectre: "spectre", Ténèbres: "tenebres", Vol: "vol"
};
const DERIVED = {
  armure: "defense", barriere: "defenseSpeciale", initiative: "vitesse",
  physique: "attaque", special: "attaqueSpeciale"
};

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Return a proposed actor and warnings; ambiguous actors are never silently assigned a type. */
export function convertLegacyActor(actor, { root, primaryType, secondaryType = "" } = {}) {
  const attrs = actor.system?.attributes ?? {};
  const stats = { ...attrs.StatistiquesHumain, ...attrs.Statistiques };
  const hasHumanStats = ["charisme", "discrétion", "talent", "connaissance"].some(key => key in stats);
  const hasBattleStats = ["attaque", "attaqueSpe", "defense", "defenseSpe", "vitesse"].some(key => key in stats);
  const type = root === "Pokémons" || (!hasHumanStats && hasBattleStats)
    || (!hasHumanStats && !hasBattleStats && /\/Pokemons\//i.test(decodeURIComponent(actor.img ?? "")))
    ? "pokemon" : "trainer";
  const warnings = [];
  if (!hasHumanStats && !hasBattleStats && root !== "Pokémons") {
    warnings.push(`no recognizable stats; placeholder ${type} inferred from portrait path`);
  }
  const parsed = {};
  for (const [key, legacyKey] of Object.entries(STATS)) {
    if (type === "pokemon" && ["charisme", "discretion", "talent", "connaissance"].includes(key)) continue;
    const value = numeric(stats[legacyKey]?.value);
    if (value === null) {
      warnings.push(`${key}: no numeric value`);
      continue;
    }
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      warnings.push(`${key}: out of Lobia's 0–100 integer range (${value})`);
      continue;
    }
    parsed[key] = { base: value, mod: 0 };
  }
  const hp = actor.system?.health ?? {};
  const hpMax = numeric(hp.max);
  const hpValue = numeric(hp.value);
  if (!Number.isInteger(hpMax) || hpMax < 0 || !Number.isInteger(hpValue) || hpValue < 0) {
    warnings.push("health: invalid or missing values");
  }
  const derivedMods = {};
  for (const [key, stat] of Object.entries(DERIVED)) {
    const raw = attrs.Modificateurs?.[key]?.value
      ?? attrs.Modificateurs?.[{ barriere: "barrière", special: "spécial" }[key]]?.value;
    const value = numeric(raw);
    if (!Number.isInteger(value)) continue;
    const score = parsed[stat]?.base;
    if (score === undefined) continue;
    const automatic = key === "initiative" ? Math.trunc(score / 10) * 2 : Math.trunc(score / 10);
    derivedMods[key] = value - automatic;
  }
  const source = structuredClone(actor);
  const originalSystem = source.system;
  const originalFlags = source.flags ?? {};
  const inferredType = primaryType ?? TYPE_KEYS[root] ?? "normal";
  if (type === "pokemon" && !primaryType && !TYPE_KEYS[root]) {
    warnings.push("Pokémon type not known from folder; review primary type");
  }
  source.type = type;
  source.system = {
    hp: { value: Math.max(0, hpValue ?? 10), base: Math.max(0, hpMax ?? 10) },
    stats: parsed,
    derivedMods,
    notes: originalSystem?.biography ?? "",
    ...(type === "pokemon" ? { type: { primary: inferredType, secondary: secondaryType } } : {})
  };
  source.prototypeToken = { ...source.prototypeToken, bar1: { attribute: "hp" }, bar2: { attribute: null } };
  source.flags = { ...originalFlags, lobia: {
    ...originalFlags.lobia, legacyWorldbuilding: { system: originalSystem, flags: originalFlags.worldbuilding ?? {} }
  } };
  source._stats = { ...source._stats, systemId: "lobia", systemVersion: "0.1.0" };
  delete source.flags.worldbuilding;
  return { actor: source, warnings: warnings.map(warning => `${actor.name} (${actor._id}): ${warning}`) };
}
