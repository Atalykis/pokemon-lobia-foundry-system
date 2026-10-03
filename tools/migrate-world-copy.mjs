/**
 * Convert ONLY an offline disposable world copy under /tmp/opencode.
 * node tools/migrate-world-copy.mjs /tmp/opencode/lobia-world-trial-2026-09-27 --apply
 * The live world and Foundry backup are never opened for writing by this script.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { convertLegacyActor, TYPE_KEYS } from "./legacy-actor-conversion.mjs";
import { pokemonSpecies } from "../module/data/pokemon-species.mjs";

const root = path.resolve(process.argv[2] ?? "");
const scratch = path.resolve("/tmp/opencode");
if (!root.startsWith(`${scratch}${path.sep}`) || fs.realpathSync(root) !== root
  || root === path.resolve("/tmp/opencode/lobia-world-snapshot")) {
  throw new Error("Pass a disposable offline world COPY under /tmp/opencode (not the older snapshot)");
}
const manifestPath = path.join(root, "world.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.system !== "worldbuilding" || manifest.flags?.lobia?.migrationVersion) {
  throw new Error("Expected an unmigrated worldbuilding world copy");
}
if (!process.argv.includes("--apply")) {
  console.log(`Dry run: ${root}. Pass --apply to convert this offline copy.`);
  process.exit(0);
}
const foundryRoot = process.env.FOUNDRY_ROOT ?? path.join(os.homedir(), "Downloads", "FoundryVTT-Node-13.351");
const { ClassicLevel } = createRequire(path.join(foundryRoot, "package.json"))("classic-level");
function ancestry(id, folders) {
  const chain = [];
  const seen = new Set();
  while (id && folders.has(id) && !seen.has(id)) {
    seen.add(id);
    const folder = folders.get(id);
    chain.unshift(folder.name);
    id = folder.folder;
  }
  return chain;
}
function merge(base, changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return changes;
  const result = structuredClone(base ?? {});
  for (const [key, value] of Object.entries(changes)) {
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? merge(result[key], value) : structuredClone(value);
  }
  return result;
}
async function open(dir) {
  const db = new ClassicLevel(dir, { valueEncoding: "json" });
  await db.open();
  return db;
}
async function scan(db, prefix) {
  const entries = [];
  for await (const [key, value] of db.iterator()) {
    if (String(key).startsWith(prefix)) entries.push([String(key), value]);
  }
  return entries;
}
async function convertCollection(dir, { packed = false } = {}) {
  const db = await open(dir);
  try {
    const folders = new Map((await scan(db, "!folders!")).map(([, folder]) => [folder._id, folder]));
    const original = new Map((await scan(db, "!actors!")).map(([, actor]) => [actor._id, actor]));
    const converted = new Map();
    const warnings = [];
    const batch = db.batch();
    for (const [key, actor] of await scan(db, "!actors!")) {
      const chain = ancestry(actor.folder, folders);
      const species = pokemonSpecies(actor.name);
      const primaryType = packed ? TYPE_KEYS[chain[0]]
        : chain[0] === "Pokémons" ? TYPE_KEYS[chain[1]] : species?.types[0];
      const result = convertLegacyActor(actor, {
        root: packed ? "Pokémons" : chain[0], primaryType,
        secondaryType: species?.types[1] ?? ""
      });
      converted.set(actor._id, result.actor);
      warnings.push(...result.warnings);
      batch.put(key, result.actor);
    }
    await batch.write();
    return { original, converted, warnings };
  } finally {
    await db.close();
  }
}

// All writes are confined to this copy. Keep old token deltas under flags so unusual
// SWB fields can still be recovered after opening the migrated world in Foundry.
const world = await convertCollection(path.join(root, "data", "actors"));
const pack = await convertCollection(path.join(root, "packs", "pokemons"), { packed: true });
const scenes = await open(path.join(root, "data", "scenes"));
let tokenCount = 0;
let deltaCount = 0;
let orphanCount = 0;
try {
  const tokens = new Map(await scan(scenes, "!scenes.tokens!"));
  const batch = scenes.batch();
  for (const [key, token] of tokens) {
    if (token.bar1?.attribute === "health" || token.bar2?.attribute === "power") {
      token.bar1 = { attribute: "hp" };
      token.bar2 = { attribute: null };
      batch.put(key, token);
      tokenCount++;
    }
    if (token.actorId && !world.converted.has(token.actorId)) orphanCount++;
  }
  for (const [key, delta] of await scan(scenes, "!scenes.tokens.delta!")) {
    const suffix = key.slice("!scenes.tokens.delta!".length);
    const tokenKey = `!scenes.tokens!${suffix.slice(0, suffix.lastIndexOf("."))}`;
    const token = tokens.get(tokenKey);
    const source = world.original.get(token?.actorId);
    const converted = world.converted.get(token?.actorId);
    if (!source || !converted) continue; // pre-existing orphaned token, leave delta intact
    if (Object.keys(delta.system ?? {}).length) {
      const merged = { ...source, system: merge(source.system, delta.system) };
      const result = convertLegacyActor(merged, {
        root: converted.type === "pokemon" ? "Pokémons" : "",
        primaryType: converted.system.type?.primary, secondaryType: converted.system.type?.secondary
      });
      delta.flags = { ...delta.flags, lobia: {
        ...delta.flags?.lobia, legacyWorldbuildingDelta: delta.system
      } };
      delta.system = result.actor.system;
      batch.put(key, delta);
      deltaCount++;
    }
  }
  await batch.write();
} finally {
  await scenes.close();
}
manifest.system = "lobia";
manifest.systemVersion = "0.1.0";
manifest.flags = { ...manifest.flags, lobia: { ...manifest.flags?.lobia, migrationVersion: 1 } };
for (const compendium of manifest.packs ?? []) compendium.system = "lobia";
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ worldActors: world.converted.size, packActors: pack.converted.size,
  tokenBarsUpdated: tokenCount, tokenDeltasUpdated: deltaCount, preexistingOrphanTokens: orphanCount,
  warnings: world.warnings.length, warningExamples: world.warnings.slice(0, 15) }, null, 2));
