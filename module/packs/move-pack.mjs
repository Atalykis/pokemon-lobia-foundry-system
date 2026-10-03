import { LOBIA } from "../config.mjs";
import { POKEMON_MOVES } from "../data/pokemon-moves-data.mjs";
import { setPokemonMoves, resetPokemonMoves } from "../data/pokemon-moves.mjs";

export const MOVES_VERSION = 1;
export const movePackId = () => `world.${LOBIA.movePack.name}`;
export const isMoveDocument = doc => doc?.pack === movePackId() && doc.type === "capacite";

export async function ensureMoveCompendium() {
  const id = movePackId();
  const existing = game.packs.get(id);
  if (existing || !game.user.isGM) return { pack: existing ?? null, created: false };
  console.log(`Lobia | Creating Pokémon move compendium "${id}"`);
  try {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      ...LOBIA.movePack, type: "Item"
    });
    if (!pack) throw new Error("createCompendium returned nothing");
    await pack.configure({ ownership: {
      GAMEMASTER: "OWNER", ASSISTANT: "OWNER", TRUSTED: "INHERIT", PLAYER: "OBSERVER"
    } });
    return { pack, created: true };
  } catch (error) {
    console.error(`Lobia | Could not create move compendium "${id}"`, error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    return { pack: null, created: false };
  }
}

async function ensureTypeFolders(pack) {
  const byKey = new Map([...pack.folders].map(folder => [folder.getFlag("lobia", "key"), folder]));
  const missing = Object.keys(LOBIA.types).filter(type => !byKey.has(`move-type-${type}`))
    .map((type, index) => ({
      name: game.i18n.localize(LOBIA.types[type]), type: "Item", sorting: "m",
      sort: (index + 1) * 1000, flags: { lobia: { key: `move-type-${type}` } }
    }));
  if (missing.length) {
    const created = await Folder.implementation.createDocuments(missing, { pack: pack.collection });
    for (const folder of created) byKey.set(folder.getFlag("lobia", "key"), folder);
  }
  return new Map(Object.keys(LOBIA.types).map(type => [type, byKey.get(`move-type-${type}`)?.id ?? null]));
}

/** Merge by stable key; routine upgrades preserve GM edits, including custom moves. */
export async function importMoves({ replace = false, overwrite = false } = {}) {
  const { pack } = await ensureMoveCompendium();
  if (!pack) throw new Error(`Lobia | Pokémon move compendium "${movePackId()}" unavailable`);
  if (pack.locked) await pack.configure({ locked: false });
  if (replace) {
    const ids = (await pack.getIndex()).map(doc => doc._id);
    if (ids.length) await Item.implementation.deleteDocuments(ids, { pack: pack.collection });
  }
  const folderFor = await ensureTypeFolders(pack);
  const index = await pack.getIndex({ fields: ["flags.lobia.key", "system.key", "folder"] });
  const existing = new Map(index.map(doc => [doc.flags?.lobia?.key ?? doc.system?.key, doc]));
  const create = [], update = [], positions = {};
  for (const move of POKEMON_MOVES) {
    const data = {
      name: move.name, type: "capacite", folder: folderFor.get(move.type),
      sort: (positions[move.type] = (positions[move.type] ?? 0) + 1) * 1000,
      system: { key: move.key, type: move.type, category: move.category, class: move.class,
        damage: move.damage, difficulty: move.difficulty, contact: move.contact, description: move.description },
      flags: { lobia: { key: move.key } }
    };
    const found = existing.get(move.key);
    if (!found) create.push(data);
    else if (overwrite) {
      const revision = { _id: found._id, ...data };
      if (found.folder) delete revision.folder;
      update.push(revision);
    }
  }
  if (create.length) await Item.implementation.createDocuments(create, { pack: pack.collection });
  if (update.length) await Item.implementation.updateDocuments(update, { pack: pack.collection });
  console.log(`Lobia | Pokémon move import — ${create.length} created, ${update.length} updated`);
  return { created: create.length, updated: update.length };
}

export async function refreshMoveRegistry({ rerender = true } = {}) {
  const pack = game.packs.get(movePackId());
  if (!pack) {
    resetPokemonMoves();
    console.log("Lobia | Move compendium unavailable — using bundled fallback");
    return;
  }
  try {
    const docs = await pack.getDocuments();
    setPokemonMoves(docs);
    console.log(`Lobia | Pokémon move registry loaded — ${docs.filter(d => d.type === "capacite").length} entries`);
    if (rerender) {
      for (const actor of [...game.actors, ...(game.packs.get("lobia.pokemons")?.contents ?? [])]) {
        if (actor.type === "pokemon" && actor.sheet?.rendered) actor.sheet.render(false);
      }
    }
  } catch (error) {
    resetPokemonMoves();
    console.error("Lobia | Could not read Pokémon move compendium", error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
  }
}

export async function setupMoveCompendium({ force = false } = {}) {
  if (!game.user.isGM) return refreshMoveRegistry({ rerender: false });
  const { pack, created } = await ensureMoveCompendium();
  if (!pack) return;
  const seen = game.settings.get("lobia", "movesVersion") ?? 0;
  const count = (await pack.getIndex()).size;
  if (created || force || seen < MOVES_VERSION) {
    console.log(`Lobia | Seeding Pokémon moves v${MOVES_VERSION} (world at v${seen}, pack holds ${count})`);
    try {
      await importMoves({ overwrite: force });
      await game.settings.set("lobia", "movesVersion", MOVES_VERSION);
    } catch (error) {
      console.error("Lobia | Could not seed Pokémon moves", error);
      ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    }
  } else console.log(`Lobia | Pokémon move compendium up to date (v${seen}, ${count} entries)`);
  await refreshMoveRegistry({ rerender: false });
}
