import { LOBIA } from "../config.mjs";
import { POKEMON_NATURES } from "../data/pokemon-natures.mjs";
import { setNatureRegistry, resetNatureRegistry } from "../data/nature-registry.mjs";

export const NATURES_VERSION = 1;
export const naturePackId = () => `world.${LOBIA.naturePack.name}`;
export const isNatureDocument = doc => doc?.pack === naturePackId() && doc.type === "nature";

export async function ensureNatureCompendium() {
  const id = naturePackId();
  const existing = game.packs.get(id);
  if (existing || !game.user.isGM) return { pack: existing ?? null, created: false };
  console.log(`Lobia | compendium "${id}" not found — creating it`);
  try {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      ...LOBIA.naturePack, type: "Item"
    });
    if (!pack) throw new Error("createCompendium returned nothing");
    await pack.configure({
      ownership: { GAMEMASTER: "OWNER", ASSISTANT: "OWNER", TRUSTED: "INHERIT", PLAYER: "OBSERVER" }
    });
    console.log(`Lobia | created compendium "${id}"`);
    return { pack, created: true };
  } catch (error) {
    console.error(`Lobia | Could not create Nature compendium "${id}"`, error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    return { pack: null, created: false };
  }
}

/** Merge by stable flag so renamed documents stay in place, preserving GM folder moves. */
export async function importNatures({ replace = false } = {}) {
  const { pack } = await ensureNatureCompendium();
  if (!pack) throw new Error(`Lobia | Nature compendium "${naturePackId()}" is unavailable`);
  if (pack.locked) await pack.configure({ locked: false });
  if (replace) {
    const ids = (await pack.getIndex()).map(doc => doc._id);
    if (ids.length) await Item.implementation.deleteDocuments(ids, { pack: pack.collection });
  }
  const index = await pack.getIndex({ fields: ["flags.lobia.key", "folder"] });
  const existing = new Map(index.map(doc => [doc.flags?.lobia?.key, doc]));
  const create = [], update = [];
  for (const [i, [key, effects]] of POKEMON_NATURES.entries()) {
    const data = {
      name: game.i18n.localize(`LOBIA.Nature.${key}`), type: "nature", sort: (i + 1) * 1000,
      system: {
        key, min: i * 4 + 1, max: i * 4 + 4,
        effects: Object.fromEntries(Object.keys(LOBIA.stats).map(stat => [stat, effects[stat] ?? 0]))
      },
      flags: { lobia: { key: `nature-${key}` } }
    };
    const found = existing.get(`nature-${key}`);
    if (found) update.push({ _id: found._id, ...data });
    else create.push(data);
  }
  if (create.length) await Item.implementation.createDocuments(create, { pack: pack.collection });
  if (update.length) await Item.implementation.updateDocuments(update, { pack: pack.collection });
  console.log(`Lobia | Nature import done — ${create.length} created, ${update.length} updated`);
  return { created: create.length, updated: update.length };
}

export async function refreshNatureRegistry({ rerender = true } = {}) {
  const pack = game.packs.get(naturePackId());
  if (!pack) {
    resetNatureRegistry();
    console.log("Lobia | Nature compendium unavailable — using bundled fallback");
    return;
  }
  try {
    const docs = (await pack.getDocuments()).filter(doc => doc.type === "nature");
    setNatureRegistry(docs);
    console.log(`Lobia | Nature registry loaded — ${docs.length} natures (compendium)`);
    if (rerender) {
      // Refresh world actors and already-loaded system-pack actors without loading
      // all 1,127 Pokémon solely to refresh a Nature edit.
      const loadedPokemon = game.packs.get("lobia.pokemons")?.contents ?? [];
      for (const actor of [...game.actors, ...loadedPokemon]) {
        if (actor.type !== "pokemon") continue;
        actor.prepareData();
        if (actor.sheet?.rendered) actor.sheet.render(false);
      }
    }
  } catch (error) {
    resetNatureRegistry();
    console.error("Lobia | Could not read Nature compendium — using bundled fallback", error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
  }
}

export async function setupNatureCompendium({ force = false } = {}) {
  if (!game.user.isGM) return refreshNatureRegistry({ rerender: false });
  const { pack, created } = await ensureNatureCompendium();
  if (!pack) return;
  const seen = game.settings.get("lobia", "naturesVersion") ?? 0;
  const count = (await pack.getIndex()).size;
  if (force || created || seen < NATURES_VERSION) {
    console.log(`Lobia | seeding natures v${NATURES_VERSION} (world at v${seen}, pack holds ${count})`);
    try {
      await importNatures();
      await game.settings.set("lobia", "naturesVersion", NATURES_VERSION);
    } catch (error) {
      console.error("Lobia | Could not seed Nature compendium", error);
      ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    }
  } else console.log(`Lobia | Nature compendium up to date (v${seen}, ${count} entries)`);
  await refreshNatureRegistry({ rerender: false });
}
