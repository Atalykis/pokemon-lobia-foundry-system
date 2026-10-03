/** Validate every LG update against Foundry v13's real DataField schema. */
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

const foundryRoot = process.env.FOUNDRY_ROOT ?? path.join(os.homedir(), "Downloads", "FoundryVTT-Node-13.351");
const fields = await import(path.join(foundryRoot, "common/data/fields.mjs"));
globalThis.foundry = { data: { fields }, abstract: {
  TypeDataModel: class { static migrateData(source) { return source; } }
} };
const { default: Pokemon } = await import("../../module/data/actor-pokemon.mjs");
const { pokemonTemplateUpdates } = await import("../../module/data/pokemon-species.mjs");
const { LOBIA_POKEDEX_SPECIES, POKEDEX_SPECIES } = await import("../../module/data/pokemon-pokedex.mjs");
const schema = new fields.SchemaField(Pokemon.defineSchema());
const lgProfiles = [...Object.values(LOBIA_POKEDEX_SPECIES), POKEDEX_SPECIES.divighost];
for (const species of lgProfiles) {
  const source = {};
  for (const [path, value] of Object.entries(pokemonTemplateUpdates(species))) {
    const parts = path.slice("system.".length).split(".");
    let target = source;
    for (const part of parts.slice(0, -1)) target = target[part] ??= {};
    target[parts.at(-1)] = value;
  }
  const failure = schema.validate(schema.clean(source));
  assert.equal(failure, undefined, `${species.name}: ${failure}`);
}
console.log(`Foundry v13 schema: ${lgProfiles.length} LG species profiles valid`);
