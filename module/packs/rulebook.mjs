import { LOBIA } from "../config.mjs";

/**
 * The player-facing Guide du Dresseur holds useful in-Foundry rules and GM-written
 * material. Its former generated Trainer skill/tree chapters are retired below.
 */

const log = (...args) => console.log("Lobia |", ...args);

export function rulebookPackId() {
  return `world.${LOBIA.rulebookPack.name}`;
}

/**
 * Return the rulebook compendium, creating it if the world does not have it.
 * Players are granted OBSERVER on creation so they can read it without the GM sharing
 * every entry by hand.
 * @returns {Promise<{pack: CompendiumCollection|null, created: boolean}>}
 */
export async function ensureRulebookPack() {
  const collection = rulebookPackId();
  if (!game.user.isGM) return { pack: game.packs.get(collection) ?? null, created: false };

  const existing = game.packs.get(collection);
  if (existing) return { pack: existing, created: false };

  const { name, label } = LOBIA.rulebookPack;
  log(`compendium "${collection}" not found — creating it`);
  try {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      name, label, type: "JournalEntry"
    });
    if (!pack) throw new Error("createCompendium returned nothing");
    await pack.configure({
      ownership: { GAMEMASTER: "OWNER", ASSISTANT: "OWNER", TRUSTED: "INHERIT", PLAYER: "OBSERVER" }
    });
    log(`created compendium "${pack.collection}" (players: OBSERVER)`);
    return { pack, created: true };
  } catch (err) {
    console.error(`Lobia | Could not create the rulebook compendium "${collection}"`, err);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: err.message }));
    return { pack: null, created: false };
  }
}

/**
 * Retire only our legacy Trainer chapters. GM-written pages inside one are kept in
 * that same JournalEntry; unrelated entries (including Météo) are never touched.
 */
export async function cleanupGeneratedGuide() {
  const result = { removedChapters: 0, removedPages: 0, preservedChapters: 0 };
  if (!game.user.isGM) return result;
  const { pack } = await ensureRulebookPack();
  if (!pack) return result;
  const restoreLock = pack.locked;
  try {
    const keys = new Set(Object.keys(LOBIA.types).map(type => `type-${type}`));
    const generated = (await pack.getDocuments()).filter(entry =>
      entry.getFlag("lobia", "generated") === true && keys.has(entry.getFlag("lobia", "key")));
    if (!generated.length) {
      log("Guide du Dresseur: no generated Trainer chapters to remove");
      return result;
    }
    if (restoreLock) await pack.configure({ locked: false });
    const empty = [];
    for (const entry of generated) {
      const generatedPages = [...entry.pages].filter(page => page.getFlag("lobia", "generated") === true
        && /^(arbre|skills)-/.test(page.getFlag("lobia", "key") ?? ""));
      const retainedPages = [...entry.pages].filter(page => !generatedPages.includes(page));
      if (!retainedPages.length) {
        empty.push(entry.id);
        result.removedPages += generatedPages.length;
        continue;
      }
      if (generatedPages.length) {
        await entry.deleteEmbeddedDocuments("JournalEntryPage", generatedPages.map(page => page.id));
        result.removedPages += generatedPages.length;
      }
      await entry.update({ "flags.lobia.-=generated": null, "flags.lobia.-=key": null });
      result.preservedChapters++;
    }
    if (empty.length) {
      await JournalEntry.implementation.deleteDocuments(empty, { pack: pack.collection });
      result.removedChapters = empty.length;
    }
    log(`Guide du Dresseur: ${result.removedChapters} generated chapters removed, `
      + `${result.removedPages} generated pages removed, ${result.preservedChapters} GM-authored chapters kept`);
  } catch (error) {
    console.error("Lobia | Could not clean up generated Trainer guide chapters", error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
  } finally {
    if (restoreLock && !pack.locked) {
      try { await pack.configure({ locked: true }); }
      catch (error) { console.error("Lobia | Could not re-lock Guide du Dresseur", error); }
    }
  }
  return result;
}
