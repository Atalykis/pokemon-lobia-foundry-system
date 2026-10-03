import assert from "node:assert/strict";
import { POKEMON_MOVES } from "../../module/data/pokemon-moves-data.mjs";
import { getPokemonMoves, pokemonMove, setPokemonMoves, resetPokemonMoves } from "../../module/data/pokemon-moves.mjs";

const original = pokemonMove("Choc météore");
assert.ok(original);
const edited = {
  type: "capacite", name: "Choc céleste", sort: 1000,
  system: { ...original, description: "Effet personnalisé" }
};
const custom = {
  type: "capacite", name: "Nouvelle attaque", sort: 2000,
  system: { ...original, key: "custom-nouvelle-attaque", description: "Création du MJ" }
};
setPokemonMoves([edited, custom]);
assert.equal(getPokemonMoves().length, 2);
assert.equal(pokemonMove("Choc météore")?.name, "Choc céleste", "old tree labels resolve renamed moves by key");
assert.equal(pokemonMove("Choc céleste")?.description, "Effet personnalisé");
assert.equal(pokemonMove("Nouvelle attaque")?.description, "Création du MJ");
assert.equal(pokemonMove("Industrike"), null, "deleted compendium moves must not reappear from bundled data");
setPokemonMoves([]);
assert.equal(pokemonMove("Choc météore"), null, "empty compendium is authoritative");
resetPokemonMoves();
assert.equal(getPokemonMoves().length, POKEMON_MOVES.length);
assert.equal(pokemonMove("Choc météore"), original);
console.log("Pokémon move registry: edited, renamed, custom, deleted and fallback: OK");
