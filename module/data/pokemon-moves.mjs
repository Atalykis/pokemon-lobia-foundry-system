import { POKEMON_MOVES, POKEMON_MOVE_CATEGORIES } from "./pokemon-moves-data.mjs";
import { pokemonTreeBonus } from "./pokemon-tree.mjs";

const normalize = name => String(name ?? "").toLocaleLowerCase("fr").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
let moves = POKEMON_MOVES;
let byName = new Map();
let byKey = new Map();
const sourceKeyByName = new Map(POKEMON_MOVES.map(move => [normalize(move.name), move.key]));
const categories = new Map(POKEMON_MOVE_CATEGORIES.map(category => [category.key, category.name]));

function indexMoves() {
  byName = new Map(moves.map(move => [normalize(move.name), move]));
  byKey = new Map(moves.map(move => [move.key, move]));
}
indexMoves();

export const getPokemonMoves = () => moves;
export function setPokemonMoves(documents) {
  moves = documents.filter(doc => doc.type === "capacite").map(doc => ({
    key: doc.system.key, name: doc.name, type: doc.system.type, category: doc.system.category,
    class: doc.system.class, damage: doc.system.damage, difficulty: doc.system.difficulty,
    contact: doc.system.contact, description: doc.system.description, sort: doc.sort ?? 0
  })).filter(move => move.key).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  indexMoves();
}
export function resetPokemonMoves() { moves = POKEMON_MOVES; indexMoves(); }

/** Pokédex source spellings -> exact names in Capacités.xlsx. Never fuzzy-match at runtime. */
export const POKEMON_MOVE_ALIASES = {
  "Acidarmarure": "Acidarmure",
  "Amasse sable": "Amass'sable",
  "Annihilation": "Anihilation",
  "Appels soins": "Appel soin",
  "Appel des esprit": "Appel des esprits",
  "Balle glace": "Ball'glace",
  "Balle graines": "Balle graine",
  "Balle météo": "Ball'météo",
  "Balle ombre": "Ball'ombre",
  "Bange sonique": "Bang sonique",
  "Bombaimant": "Bombe aimant",
  "Botte secrète": "Botte sucrette",
  "Boube bome": "Boue-bombe",
  "Bouclier royale": "Bouclier royal",
  "Boudron": "Bourdon",
  "Boule armure": "Boul'armure",
  "Boule électrique": "Boule élek",
  "Boule pollen": "Boulle pollen",
  "Braises draconique": "Braises draconiques",
  "Buldoboule": "Bulldoboule",
  "Bullr armure": "Bulle armure",
  "Centrifugiffle": "Centrifugifle",
  "Changement de vitesse": "Change-vitesse",
  "Changement-vitesse": "Change-vitesse",
  "Combo griffes": "Combo-griffe",
  "Canon florale": "Canon floral",
  "Caramaderie": "Camaraderie",
  "Cortège funèbres": "Cortège funèbre",
  "Coud'jus": "Coup d'jus",
  "Coud'main": "Coup d'main",
  "Cristalisation": "Cristallisation",
  "Coup de boue": "Coud'boue",
  "Coup de boule": "Coup d'boule",
  "Coup de corne": "Koud'corne",
  "Coup de jus": "Coup d'jus",
  "Coup de main": "Coup d'main",
  "Croc fatale": "Croc fatal",
  "Croc larme": "Croco larme",
  "Croche venimeux": "Crochet venimeux",
  "Crochet venin": "Crochet venimeux",
  "Croco larmes": "Croco larme",
  "Crocs de feu": "Crocs feu",
  "Crosc givre": "Crocs givre",
  "Cru aile": "Cru-ailes",
  "Danse flamme": "Danse flammes",
  "Danse fleur": "Danse fleurs",
  "Danse plume": "Danse plumes",
  "Déglagration": "Déflagration",
  "Démence obsessionnel": "Démence obsessionnelle",
  "Démense obsessionnel": "Démence obsessionnelle",
  "Direct toxique": "Direct toxik",
  "Dracophonie": "Dracacophonie",
  "Draochoc": "Draco-choc",
  "Ebulition": "Ebullition",
  "Ebulittion": "Ebullition",
  "Ebulllition": "Ebullition",
  "Ebullilave": "Ebulilave",
  "Eclats de glace": "Eclats glace",
  "Eco-shère": "Eco-sphère",
  "Ecrase face": "Ecras'face",
  "Extrasanseur": "Extrasenseur",
  "Ecrous de poing": "Ecrous d'poing",
  "Empale corne": "Empal'korne",
  "Feuillage magik": "Feuille magik",
  "Feuille magique": "Feuille magik",
  "Flas rush": "Flash rush",
  "Fouet liane": "Fouet lianes",
  "Fracasse tête": "Fracass'tête",
  "Frappoculte": "Frappocculte",
  "Furi-bond": "Furie-bond",
  "Gaz toxique": "Gaz toxik",
  "Grande nettoyage": "Grand nettoyage",
  "Griffe funeste": "Griffes funestes",
  "Glisse herbe": "Gliss'herbe",
  "Gros yeux": "Groz'yeux",
  "Haloween": "Halloween",
  "Hulement": "Hurlement",
  "Icberguarde": "Icebergarde",
  "Indignation": "Indignition",
  "Intervension": "Interversion",
  "Jet pierre": "Jet-pierres",
  "Koud'korne": "Koud'corne",
  "Lamécaille": "Lamécailles",
  "Lilliputien": "Lilliput",
  "Lien destin": "Lien du Destin",
  "Marteau de glace": "Marteau glace",
  "Masse d'os": "Massd'os",
  "Mitr-poing": "Mitra-poing",
  "Multi toxique": "Multitoxik",
  "Ocroupie": "Ocroupi",
  "Pics toxique": "Pics toxik",
  "Pics toxiques": "Pics toxik",
  "Piège venin": "Piège de venin",
  "Poing de feu": "Poing feu",
  "Plumes tranchante": "Plumes tranchantes",
  "Pouls de Hadès": "Pouls d'Hadès",
  "Poudre toxique": "Poudre toxik",
  "Psy coup de boule": "Psykoud'boul",
  "Psykoud'boule": "Psykoud'boul",
  "Puissancce": "Puissance",
  "Racif rocheux": "Récif rocheux",
  "Récifs rocheux": "Récif rocheux",
  "Reflet magique": "Reflet magik",
  "Résonance minérale": "Résonnance minérale",
  "Ronces sylvestre": "Ronces sylvestres",
  "Rune protectrice": "Rune protect",
  "Siffle herbe": "Siffl'herbe",
  "Souffle toxique": "Souffle toxine",
  "Stalagtite": "Stalactite",
  "Syphon": "Siphon",
  "Surf'apesenteur": "Surf'apesanteur",
  "Tempête floral": "Tempête florale",
  "Tempête sable": "Tempête de sable",
  "Tempêt de sable": "Tempête de sable",
  "Toile électrique": "Toile élek",
  "Toucher dégradé": "Touché dégradé",
  "Tour magique": "Tour de magie",
  "Tourmagik": "Tour de magie",
  "Toxique": "Toxik",
  "Tranche air": "Tranch'air",
  "Tranche herbe": "Tranch'herbe",
  "Triple attaque": "Triplattaque",
  "Tunnelier": "Tunelier",
  "Vague à lames": "Vagues à lames",
  "Vegeance": "Vengeance",
  "Vent argentée": "Vent argenté",
  "Verouillage": "Verrouillage",
  "Vibroscur": "Vibrobscur",
  "Vol magnétique": "Vol magnétik",
  "Vol vie": "Vole-vie"
};
const aliases = new Map(Object.entries(POKEMON_MOVE_ALIASES).map(([source, name]) => [normalize(source), name]));

/** Look up exact and reviewed Pokédex spellings against the move workbook. */
export function pokemonMove(name) {
  // Normalizing punctuation would otherwise turn "Armure +" (a tree bonus)
  // into "Armure" (a move), showing the wrong tooltip and learned capacity.
  if (pokemonTreeBonus(name)) return null;
  const key = normalize(name);
  const canonical = normalize(aliases.get(key) ?? name);
  return byName.get(key) ?? byName.get(canonical)
    ?? byKey.get(sourceKeyByName.get(canonical)) ?? null;
}
export function pokemonMoveCategory(key) { return categories.get(key) ?? key; }
