/**
 * Convert the Pokemon actor pack from the legacy Simple World-Building world into
 * a Lobia system compendium. Run while Foundry is stopped, or write to a fresh path.
 *
 * SOURCE_PACK=/path/to/world/packs/pokemons node tools/import-pokemon-pack.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const foundryRoot = process.env.FOUNDRY_ROOT
  ?? path.join(os.homedir(), "Downloads", "FoundryVTT-Node-13.351");
const require = createRequire(path.join(foundryRoot, "package.json"));
const { ClassicLevel } = require("classic-level");

const dataRoot = path.join(os.homedir(), ".local", "share", "foundryvtt", "Data");
const sourcePath = process.env.SOURCE_PACK
  ?? path.join(dataRoot, "worlds", "lobia", "packs", "pokemons");
const destinationPath = process.env.DESTINATION_PACK
  ?? path.join(dataRoot, "systems", "lobia", "packs", "pokemons");
const force = process.argv.includes("--force");

const TYPE_KEYS = {
  Acier: "acier",
  Combat: "combat",
  Dragon: "dragon",
  Eau: "eau",
  Electrique: "electrik",
  Fée: "fee",
  Feu: "feu",
  Glace: "glace",
  Insecte: "insecte",
  Normal: "normal",
  Plante: "plante",
  Poison: "poison",
  Psy: "psy",
  Roche: "roche",
  Sol: "sol",
  Spectre: "spectre",
  Ténèbres: "tenebres",
  Vol: "vol"
};

if (!fs.existsSync(sourcePath)) throw new Error(`Source pack does not exist: ${sourcePath}`);
if (fs.existsSync(destinationPath)) {
  if (!force) throw new Error(`Destination already exists: ${destinationPath} (use --force to replace it)`);
  fs.rmSync(destinationPath, { recursive: true });
}
fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

const source = new ClassicLevel(sourcePath, { valueEncoding: "json" });
const destination = new ClassicLevel(destinationPath, { valueEncoding: "json" });
await source.open();
await destination.open();

const folders = new Map();
const actors = [];
for await (const [key, value] of source.iterator()) {
  const entryKey = String(key);
  if (entryKey.startsWith("!folders!")) folders.set(value._id, value);
  else if (entryKey.startsWith("!actors!")) actors.push(value);
}

function rootFolder(folderId) {
  let folder = folders.get(folderId);
  const visited = new Set();
  while (folder?.folder) {
    if (visited.has(folder._id)) throw new Error(`Folder cycle at ${folder.name} (${folder._id})`);
    visited.add(folder._id);
    folder = folders.get(folder.folder);
  }
  return folder;
}

const number = value => Number(value ?? 0);
const converted = [];
for (const actor of actors) {
  const root = rootFolder(actor.folder);
  const primary = TYPE_KEYS[root?.name];
  if (!primary) throw new Error(`Unknown root type folder for ${actor.name}: ${root?.name ?? actor.folder}`);

  const sourceStats = actor.system?.attributes?.Statistiques ?? {};
  const stat = key => ({ base: number(sourceStats[key]?.value), mod: 0 });
  const hp = actor.system?.health ?? {};
  const prototypeToken = structuredClone(actor.prototypeToken ?? {});
  prototypeToken.bar1 = { attribute: "hp" };
  prototypeToken.bar2 = { attribute: null };

  converted.push({
    name: actor.name,
    type: "pokemon",
    folder: actor.folder,
    _id: actor._id,
    img: actor.img,
    system: {
      hp: { value: number(hp.value), base: number(hp.max) },
      battle: {
        deplacement: { value: 1, max: 1 },
        action: { value: 1, max: 1 },
        actionBonus: { value: 1, max: 1 },
        reaction: { value: 1, max: 1 }
      },
      stats: {
        attaque: stat("attaque"),
        attaqueSpeciale: stat("attaqueSpe"),
        defense: stat("defense"),
        defenseSpeciale: stat("defenseSpe"),
        vitesse: stat("vitesse")
      },
      derivedMods: { armure: 0, barriere: 0, initiative: 0, physique: 0, special: 0 },
      notes: actor.system?.biography ?? "",
      type: { primary, secondary: "" }
    },
    prototypeToken,
    items: [],
    effects: [],
    flags: {},
    ownership: { default: 0 },
    sort: actor.sort ?? 0,
    _stats: {
      ...(actor._stats ?? {}),
      compendiumSource: null,
      duplicateSource: null,
      systemId: "lobia",
      systemVersion: "0.1.0",
      lastModifiedBy: null
    }
  });
}

const batch = destination.batch();
for (const folder of folders.values()) {
  batch.put(`!folders!${folder._id}`, {
    ...folder,
    _stats: {
      ...(folder._stats ?? {}),
      compendiumSource: null,
      duplicateSource: null,
      systemId: "lobia",
      systemVersion: "0.1.0",
      lastModifiedBy: null
    }
  });
}
for (const actor of converted) batch.put(`!actors!${actor._id}`, actor);
await batch.write();
await destination.close();
await source.close();

console.log(`Wrote ${converted.length} Pokémon and ${folders.size} folders to ${destinationPath}`);
