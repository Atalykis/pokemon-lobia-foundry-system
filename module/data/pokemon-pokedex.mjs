import { POKEDEX_SPECIES as KANTO_SPECIES, POKEDEX_FAMILIES as KANTO_FAMILIES } from "./pokemon-kanto-data.mjs";
import { POKEDEX_SPECIES as JOHTO_SPECIES, POKEDEX_FAMILIES as JOHTO_FAMILIES } from "./pokemon-johto-data.mjs";
import { POKEDEX_SPECIES as HOENN_SPECIES, POKEDEX_FAMILIES as HOENN_FAMILIES } from "./pokemon-hoenn-data.mjs";
import { POKEDEX_SPECIES as SINNOH_SPECIES, POKEDEX_FAMILIES as SINNOH_FAMILIES } from "./pokemon-sinnoh-data.mjs";
import { POKEDEX_SPECIES as UNYS_SPECIES, POKEDEX_FAMILIES as UNYS_FAMILIES } from "./pokemon-unys-data.mjs";
import { POKEDEX_SPECIES as KALOS_SPECIES, POKEDEX_FAMILIES as KALOS_FAMILIES } from "./pokemon-kalos-data.mjs";
import { POKEDEX_SPECIES as ALOLA_SPECIES, POKEDEX_FAMILIES as ALOLA_FAMILIES } from "./pokemon-alola-data.mjs";
import { POKEDEX_SPECIES as GALAR_SPECIES, POKEDEX_FAMILIES as GALAR_FAMILIES } from "./pokemon-galar-data.mjs";
import { POKEDEX_SPECIES as HISUI_SPECIES, POKEDEX_FAMILIES as HISUI_FAMILIES } from "./pokemon-hisui-data.mjs";
import { POKEDEX_SPECIES as PALDEA_SPECIES, POKEDEX_FAMILIES as PALDEA_FAMILIES } from "./pokemon-paldea-data.mjs";
import { POKEDEX_SPECIES as LOBIA_SPECIES, POKEDEX_FAMILIES as LOBIA_FAMILIES } from "./pokemon-lobia-data.mjs";
import { POKEDEX_SPECIES as DIVIGHOST_SPECIES, POKEDEX_FAMILIES as DIVIGHOST_FAMILIES } from "./pokemon-divighost-data.mjs";

export const LOBIA_POKEDEX_SPECIES = LOBIA_SPECIES;

const books = [
  ["Kanto", KANTO_SPECIES, KANTO_FAMILIES], ["Johto", JOHTO_SPECIES, JOHTO_FAMILIES],
  ["Hoenn", HOENN_SPECIES, HOENN_FAMILIES], ["Sinnoh", SINNOH_SPECIES, SINNOH_FAMILIES],
  ["Unys", UNYS_SPECIES, UNYS_FAMILIES], ["Kalos", KALOS_SPECIES, KALOS_FAMILIES],
  ["Alola", ALOLA_SPECIES, ALOLA_FAMILIES], ["Galar", GALAR_SPECIES, GALAR_FAMILIES],
  ["Hisui", HISUI_SPECIES, HISUI_FAMILIES], ["Paldea", PALDEA_SPECIES, PALDEA_FAMILIES],
  ["Lobia", LOBIA_SPECIES, LOBIA_FAMILIES],
  ["Divighost", DIVIGHOST_SPECIES, DIVIGHOST_FAMILIES]
];

/** Source entries are disjoint, even when a later-generation relative appears in Kanto. */
export const POKEDEX_SPECIES = {};
export const POKEDEX_FAMILIES = {};
for (const [book, species, families] of books) {
  for (const [key, entry] of Object.entries(species)) {
    if (key in POKEDEX_SPECIES) throw new Error(`Duplicate Pokémon species ${key} in ${book}`);
    POKEDEX_SPECIES[key] = entry;
  }
  for (const [key, entry] of Object.entries(families)) {
    if (key in POKEDEX_FAMILIES) throw new Error(`Duplicate Pokémon family ${key} in ${book}`);
    POKEDEX_FAMILIES[key] = entry;
  }
}
