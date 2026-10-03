export const LOBIA = {};

/**
 * Battle stats shared by every actor (Pokémon and Trainer). Values are d100 skill %.
 * @type {Record<string, string>}  key -> i18n label key
 */
LOBIA.stats = {
  attaque: "LOBIA.Stat.attaque",
  attaqueSpeciale: "LOBIA.Stat.attaqueSpeciale",
  defense: "LOBIA.Stat.defense",
  defenseSpeciale: "LOBIA.Stat.defenseSpeciale",
  vitesse: "LOBIA.Stat.vitesse"
};

/** Extra stats only Trainers possess. */
LOBIA.trainerStats = {
  charisme: "LOBIA.Stat.charisme",
  discretion: "LOBIA.Stat.discretion",
  talent: "LOBIA.Stat.talent",
  connaissance: "LOBIA.Stat.connaissance"
};

/** Derived values computed from battle stats. */
LOBIA.derived = {
  armure: "LOBIA.Derived.armure",
  barriere: "LOBIA.Derived.barriere",
  initiative: "LOBIA.Derived.initiative",
  physique: "LOBIA.Derived.physique",
  special: "LOBIA.Derived.special"
};

/** Icon per derived value, used by the "Modificateur" cards. */
LOBIA.derivedIcons = {
  armure: "fa-shield-halved",
  barriere: "fa-shield-virus",
  initiative: "fa-bolt",
  physique: "fa-hand-fist",
  special: "fa-wand-sparkles"
};

/**
 * The item catalogue taxonomy lives in `module/data/item-taxonomy.mjs`.
 * Only the inventory-layout bits live here.
 */

/** Big categories shown as uncapped buckets on the Inventaire tab, in sheet order. */
LOBIA.inventoryBuckets = ["pokeball", "bonus", "recharge", "objets-tenus", "equipement", "baies"];

/** Number of weapon slots every trainer has, each with its own accessory slot. */
LOBIA.weaponSlots = 3;

/** Icons for the action-economy cards on the statistics tab. */
LOBIA.battleIcons = {
  deplacement: "fa-person-running",
  action: "fa-hand-fist",
  actionBonus: "fa-bolt",
  reaction: "fa-shield-halved"
};

/** World compendia seeded on first launch, owned and edited by the GM. */
LOBIA.itemPack = { name: "objets", label: "Objets" };
LOBIA.skillPack = { name: "competences-dresseur", label: "Compétences Dresseur" };
LOBIA.movePack = { name: "capacites-pokemon", label: "Capacités Pokémon" };
LOBIA.treePack = { name: "arbres-dresseur", label: "Arbres Dresseur" };
LOBIA.dominantTreePack = { name: "arbres-dominants", label: "Arbres Dominants" };
LOBIA.naturePack = { name: "natures-pokemon", label: "Natures Pokémon" };
LOBIA.talentPack = { name: "talents-pokemon", label: "Talents Pokémon" };

/**
 * The player-facing Guide du Dresseur contains authored rules such as Météo.
 * Its compendium is readable by players (see packs/rulebook.mjs).
 */
LOBIA.rulebookPack = { name: "guide-dresseur", label: "Guide du Dresseur" };

/** The 18 Pokémon types (key -> i18n label key). */
LOBIA.types = {
  normal: "LOBIA.Type.normal",
  feu: "LOBIA.Type.feu",
  eau: "LOBIA.Type.eau",
  plante: "LOBIA.Type.plante",
  electrik: "LOBIA.Type.electrik",
  glace: "LOBIA.Type.glace",
  combat: "LOBIA.Type.combat",
  poison: "LOBIA.Type.poison",
  sol: "LOBIA.Type.sol",
  vol: "LOBIA.Type.vol",
  psy: "LOBIA.Type.psy",
  insecte: "LOBIA.Type.insecte",
  roche: "LOBIA.Type.roche",
  spectre: "LOBIA.Type.spectre",
  dragon: "LOBIA.Type.dragon",
  tenebres: "LOBIA.Type.tenebres",
  acier: "LOBIA.Type.acier",
  fee: "LOBIA.Type.fee"
};

/** The type every Trainer has by default (their primary type is fixed). */
LOBIA.trainerBaseType = "normal";

/**
 * Critical bands for the d100 roll-under mechanic.
 * A roll <= success is a Critical Success; a roll >= failure is a Critical Failure.
 */
LOBIA.crit = {
  success: 5,
  failure: 96
};
