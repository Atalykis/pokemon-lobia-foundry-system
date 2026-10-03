import { LOBIA } from "../config.mjs";
import { POKEMON_DOMINANT_TREES } from "../data/pokemon-dominant-data.mjs";
import { getDominantTree, setDominantTrees, resetDominantTrees } from "../data/dominant-tree-registry.mjs";

export const DOMINANT_TREES_VERSION = 1;
export const dominantTreePackId = () => `world.${LOBIA.dominantTreePack.name}`;
export const isDominantTreeDocument = doc =>
  doc?.pack === dominantTreePackId() && doc.type === "arbreDominant";

export async function ensureDominantTreeCompendium() {
  const id = dominantTreePackId();
  const existing = game.packs.get(id);
  if (existing || !game.user.isGM) return { pack: existing ?? null, created: false };
  try {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      ...LOBIA.dominantTreePack, type: "Item"
    });
    if (!pack) throw new Error("createCompendium returned nothing");
    await pack.configure({
      ownership: { GAMEMASTER: "OWNER", ASSISTANT: "OWNER", TRUSTED: "INHERIT", PLAYER: "OBSERVER" }
    });
    console.log(`Lobia | created Dominant tree compendium "${id}"`);
    return { pack, created: true };
  } catch (error) {
    console.error(`Lobia | Could not create Dominant tree compendium "${id}"`, error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    return { pack: null, created: false };
  }
}

/** By default, seed only missing types; an explicit overwrite restores workbook values. */
export async function importDominantTrees({ replace = false, overwrite = false, rerender = true } = {}) {
  const { pack } = await ensureDominantTreeCompendium();
  if (!pack) throw new Error(`Lobia | Dominant tree compendium "${dominantTreePackId()}" is unavailable`);
  if (pack.locked) await pack.configure({ locked: false });
  if (replace) {
    const ids = (await pack.getIndex()).map(doc => doc._id);
    if (ids.length) await Item.implementation.deleteDocuments(ids, { pack: pack.collection });
  }
  const index = await pack.getIndex({ fields: ["flags.lobia.key", "folder"] });
  const existing = new Map(index.map(doc => [doc.flags?.lobia?.key, doc]));
  const create = [], update = [];
  for (const [i, type] of Object.keys(LOBIA.types).entries()) {
    const tree = POKEMON_DOMINANT_TREES[type];
    const data = {
      name: game.i18n.format("LOBIA.PokemonTree.dominantItemName", {
        type: game.i18n.localize(LOBIA.types[type])
      }),
      type: "arbreDominant", sort: (i + 1) * 1000,
      system: { type, labels: { ...tree.labels }, notes: { ...tree.notes } },
      flags: { lobia: { key: `dominant-${type}` } }
    };
    const found = existing.get(`dominant-${type}`);
    if (!found) create.push(data);
    else if (overwrite) update.push({ _id: found._id, ...data });
  }
  if (create.length) await Item.implementation.createDocuments(create, { pack: pack.collection });
  if (update.length) await Item.implementation.updateDocuments(update, { pack: pack.collection });
  console.log(`Lobia | Dominant trees: ${create.length} created, ${update.length} updated`);
  await refreshDominantTreeRegistry({ rerender });
  return { created: create.length, updated: update.length };
}

export async function refreshDominantTreeRegistry({ rerender = true } = {}) {
  const pack = game.packs.get(dominantTreePackId());
  if (!pack) resetDominantTrees();
  else {
    try {
      setDominantTrees((await pack.getDocuments()).filter(doc => doc.type === "arbreDominant"));
    } catch (error) {
      resetDominantTrees();
      console.error("Lobia | Could not read Dominant tree compendium", error);
      ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    }
  }
  if (!rerender) return;
  const loadedPokemon = game.packs.get("lobia.pokemons")?.contents ?? [];
  for (const actor of [...game.actors, ...loadedPokemon]) {
    if (actor.type !== "pokemon") continue;
    actor.prepareData();
    if (actor.sheet?.rendered) actor.sheet.render(false);
  }
}

export async function setupDominantTreeCompendium({ force = false } = {}) {
  if (!game.user.isGM) return refreshDominantTreeRegistry({ rerender: false });
  const { pack, created } = await ensureDominantTreeCompendium();
  if (!pack) return;
  const seen = game.settings.get("lobia", "dominantTreesVersion") ?? 0;
  if (force || created || seen < DOMINANT_TREES_VERSION) {
    try {
      await importDominantTrees({ overwrite: force, rerender: false });
      await game.settings.set("lobia", "dominantTreesVersion", DOMINANT_TREES_VERSION);
    } catch (error) {
      console.error("Lobia | Could not seed Dominant trees", error);
      ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    }
  }
  await refreshDominantTreeRegistry({ rerender: false });
}
