/** Read-only preview. Run against an offline snapshot, not the active world. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { convertLegacyActor, TYPE_KEYS } from "./legacy-actor-conversion.mjs";
import { pokemonSpecies } from "../module/data/pokemon-species.mjs";

const root = process.argv[2];
if (!root || JSON.parse(fs.readFileSync(path.join(root, "world.json"), "utf8")).system !== "worldbuilding") {
  throw new Error("Pass an offline Simple World-Building world directory");
}
const foundryRoot = process.env.FOUNDRY_ROOT ?? path.join(os.homedir(), "Downloads", "FoundryVTT-Node-13.351");
const { ClassicLevel } = createRequire(path.join(foundryRoot, "package.json"))("classic-level");
async function records(name, group = name, withKeys = false) {
  const db = new ClassicLevel(path.join(root, "data", name), { valueEncoding: "json", readOnly: true });
  await db.open();
  const docs = [];
  for await (const [key, value] of db.iterator()) if (String(key).startsWith(`!${group}!`)) docs.push(withKeys ? { key: String(key), value } : value);
  await db.close();
  return docs;
}
const folders = new Map((await records("folders")).map(folder => [folder._id, folder]));
function ancestry(id) {
  const ancestors = [];
  const visited = new Set();
  while (id && folders.has(id) && !visited.has(id)) {
    visited.add(id);
    const folder = folders.get(id);
    ancestors.unshift(folder.name);
    id = folder.folder;
  }
  return ancestors;
}
const counts = { pokemon: 0, trainer: 0, unresolved: 0 };
const warnings = [];
const unresolved = [];
const actors = await records("actors");
for (const actor of actors) {
  const chain = ancestry(actor.folder);
  const species = pokemonSpecies(actor.name);
  const { actor: proposed, warnings: issues } = convertLegacyActor(actor, {
    root: chain[0], primaryType: chain[0] === "Pokémons" ? TYPE_KEYS[chain[1]] : species?.types[0],
    secondaryType: species?.types[1] ?? ""
  });
  counts[proposed?.type ?? "unresolved"]++;
  if (!proposed) unresolved.push({ name: actor.name, id: actor._id,
    folder: chain.join(" / "), img: actor.img, attributes: Object.keys(actor.system?.attributes ?? {}) });
  warnings.push(...issues);
}
const tokens = await records("scenes", "scenes.tokens");
if (process.argv.includes("--unresolved")) {
  console.log(JSON.stringify(unresolved, null, 2));
  process.exit(0);
}
const deltas = await records("scenes", "scenes.tokens.delta");
const deltaSystemKeys = [...new Set(deltas.flatMap(delta => Object.keys(delta.system ?? {})))];
if (process.argv.includes("--token-details")) {
  console.log(JSON.stringify({ tokens: (await records("scenes", "scenes.tokens", true)).slice(0, 2),
    deltas: (await records("scenes", "scenes.tokens.delta", true)).slice(0, 3) }, null, 2));
  process.exit(0);
}
const actorIds = new Set(actors.map(actor => actor._id));
const linked = tokens.filter(token => token.actorLink);
const missing = tokens.filter(token => token.actorId && !actorIds.has(token.actorId));
const systemPackPath = path.resolve("packs/pokemons");
const systemPack = new ClassicLevel(systemPackPath, { valueEncoding: "json", readOnly: true });
await systemPack.open();
const packIds = new Set();
for await (const [key, value] of systemPack.iterator()) {
  if (String(key).startsWith("!actors!")) packIds.add(value._id);
}
await systemPack.close();
const unlinked = tokens.filter(token => !token.actorLink && token.actorId);
const macros = await records("macros");
const legacyMacros = macros.filter(macro => /(?:worldbuilding|system\.(?:health|power|attributes)|attributes\.Statistiques)/i.test(macro.command ?? ""));
const macroPack = new ClassicLevel(path.join(root, "packs", "macro-utile"), { valueEncoding: "json", readOnly: true });
await macroPack.open();
const packedMacros = [];
for await (const [key, value] of macroPack.iterator()) {
  if (String(key).startsWith("!macros!")) packedMacros.push(value);
}
await macroPack.close();
const packedLegacy = packedMacros.filter(macro => /(?:worldbuilding|system\.(?:health|power|attributes)|attributes\.Statistiques)/i.test(macro.command ?? ""));
console.log(JSON.stringify({
  actors: { total: actors.length, ...counts },
  sceneTokens: { total: tokens.length, linked: linked.length, unlinked: unlinked.length,
    deltas: deltas.length, deltaSystemKeys, deltaTypes: [...new Set(deltas.map(delta => delta.type))],
    missingActor: missing.length, missingInPack: missing.filter(token => !packIds.has(token.actorId)).length,
    missingActorExamples: missing.slice(0, 10).map(token => token.actorId) },
  macros: { total: macros.length, legacyReferences: legacyMacros.map(macro => ({ name: macro.name, id: macro._id })) },
  macroPack: { total: packedMacros.length, legacyReferences: packedLegacy.map(macro => ({ name: macro.name, id: macro._id })) },
  warnings: { total: warnings.length, examples: warnings.slice(0, 60) }
}, null, 2));
