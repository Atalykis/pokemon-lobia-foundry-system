/** Inspect an offline copy of a Simple World-Building world before migration.
 * Usage: node tools/audit-legacy-world.mjs /path/to/offline-world-copy
 * Never point this at a world currently open in Foundry.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.argv[2];
if (!root || !fs.existsSync(path.join(root, "world.json"))) {
  throw new Error("Pass the path to an offline world copy containing world.json");
}
const require = createRequire(path.join(
  process.env.FOUNDRY_ROOT ?? path.join(os.homedir(), "Downloads", "FoundryVTT-Node-13.351"), "package.json"
));
const { ClassicLevel } = require("classic-level");
const names = ["actors", "items", "folders", "scenes", "journal", "macros", "tables", "playlists", "combats", "settings"];
const summary = {};
const records = {};
for (const name of names) {
  const dir = path.join(root, "data", name);
  if (!fs.existsSync(dir)) continue;
  const db = new ClassicLevel(dir, { valueEncoding: "json", readOnly: true });
  await db.open();
  const docs = [];
  const keyGroups = {};
  for await (const [key, value] of db.iterator()) {
    const group = String(key).split("!")[1] ?? "other";
    keyGroups[group] = (keyGroups[group] ?? 0) + 1;
    if (group === name || (name === "journal" && group === "journal")) docs.push(value);
  }
  await db.close();
  records[name] = docs;
  const types = {};
  for (const doc of docs) types[doc.type ?? "(none)"] = (types[doc.type ?? "(none)"] ?? 0) + 1;
  summary[name] = { count: docs.length, types, keyGroups };
  if (name === "actors" || name === "items") {
    const examples = name === "actors" ? [docs[0], ...docs.filter(doc =>
      Object.keys(doc.system?.attributes?.Statistiques ?? {}).length > 5
      || Object.keys(doc.system?.attributes?.StatistiquesHumain ?? {}).length > 0
      || (doc.items?.length ?? 0) > 0
    ).slice(0, 5)] : docs.slice(0, 2);
    summary[name].examples = examples.filter(Boolean).map(doc => ({
      name: doc.name, type: doc.type, id: doc._id,
      system: process.argv.includes("--details") ? doc.system : Object.keys(doc.system?.attributes ?? {}),
      itemTypes: doc.items?.map(item => item.type), folder: doc.folder
    }));
    summary[name].systemKeys = [...new Set(docs.flatMap(doc => Object.keys(doc.system ?? {})))].sort();
    if (name === "actors") {
      summary[name].statGroups = [...new Set(docs.flatMap(doc => Object.keys(doc.system?.attributes ?? {})))].sort();
      summary[name].statKeys = [...new Set(docs.flatMap(doc => Object.keys(doc.system?.attributes?.Statistiques ?? {})))].sort();
      summary[name].embeddedItemCount = docs.reduce((n, doc) => n + (doc.items?.length ?? 0), 0);
    }
  }
  if (name === "scenes") {
    summary[name].tokens = docs.reduce((n, doc) => n + (doc.tokens?.length ?? 0), 0);
    summary[name].actorIds = [...new Set(docs.flatMap(doc => (doc.tokens ?? []).map(token => token.actorId).filter(Boolean)))];
  }
}
const folders = new Map(records.folders.map(folder => [folder._id, folder]));
function rootName(id) {
  let folder = folders.get(id);
  const seen = new Set();
  while (folder?.folder && !seen.has(folder._id)) {
    seen.add(folder._id);
    folder = folders.get(folder.folder);
  }
  return folder?.name ?? "(no folder)";
}
summary.actors.rootFolders = {};
summary.actors.byRoot = {};
for (const actor of records.actors) {
  const root = rootName(actor.folder);
  summary.actors.rootFolders[root] = (summary.actors.rootFolders[root] ?? 0) + 1;
  const group = summary.actors.byRoot[root] ??= { trainers: 0, pokemon: 0, statless: 0, names: [] };
  const keys = Object.keys(actor.system?.attributes?.Statistiques ?? {});
  const human = Object.keys(actor.system?.attributes?.StatistiquesHumain ?? {});
  if (keys.some(key => ["charisme", "connaissance", "discrétion", "talent"].includes(key))) group.trainers++;
  else if (human.length) group.trainers++;
  else if (keys.some(key => ["attaque", "attaqueSpe", "defense", "defenseSpe", "vitesse"].includes(key))) group.pokemon++;
  else group.statless++;
  if (group.names.length < 12) group.names.push(actor.name);
}
summary.folders.actorRoots = records.folders.filter(folder => folder.type === "Actor" && !folder.folder)
  .map(folder => ({ name: folder.name, id: folder._id }));
if (process.argv.some(arg => arg.startsWith("--actor="))) {
  const name = process.argv.find(arg => arg.startsWith("--actor=")).slice(8);
  const matches = records.actors.filter(actor => actor.name === name);
  console.log(JSON.stringify(matches.map(actor => ({ ...actor, root: rootName(actor.folder) })), null, 2));
  process.exit(0);
}
console.log(JSON.stringify(summary, null, 2));
