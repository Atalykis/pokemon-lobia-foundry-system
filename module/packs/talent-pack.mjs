import { LOBIA } from "../config.mjs";
import { TALENT_CATALOGUE, TALENT_CATEGORIES } from "./talents-data.mjs";
import { setTalentRegistry, resetTalentRegistry } from "../data/talent-registry.mjs";

export const TALENTS_VERSION = 1;
export const talentPackId = () => `world.${LOBIA.talentPack.name}`;
export const isTalentDocument = doc => doc?.pack === talentPackId() && doc.type === "talent";

export async function ensureTalentCompendium() {
  const id = talentPackId();
  const existing = game.packs.get(id);
  if (existing || !game.user.isGM) return { pack: existing ?? null, created: false };
  console.log(`Lobia | Talent compendium "${id}" not found — creating it`);
  try {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      ...LOBIA.talentPack, type: "Item"
    });
    if (!pack) throw new Error("createCompendium returned nothing");
    await pack.configure({
      ownership: { GAMEMASTER: "OWNER", ASSISTANT: "OWNER", TRUSTED: "INHERIT", PLAYER: "OBSERVER" }
    });
    console.log(`Lobia | created Talent compendium "${id}"`);
    return { pack, created: true };
  } catch (error) {
    console.error(`Lobia | Could not create Talent compendium "${id}"`, error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    return { pack: null, created: false };
  }
}

function html(text) {
  const escape = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return String(text).split(/\r?\n+/).map(line => line.trim()).filter(Boolean)
    .map(line => `<p>${escape(line)}</p>`).join("");
}

async function ensureCategoryFolders(pack) {
  const byKey = new Map();
  for (const folder of pack.folders) {
    const key = folder.getFlag("lobia", "key");
    if (key) byKey.set(key, folder);
  }
  const missing = TALENT_CATEGORIES.filter(c => !byKey.has(`talent-category-${c.key}`))
    .map(c => ({
      name: c.name, type: "Item", folder: null,
      description: html(c.description), sorting: "m",
      sort: (TALENT_CATEGORIES.findIndex(x => x.key === c.key) + 1) * 1000,
      flags: { lobia: { key: `talent-category-${c.key}` } }
    }));
  if (missing.length) {
    const created = await Folder.implementation.createDocuments(missing, { pack: pack.collection });
    for (const folder of created) byKey.set(folder.getFlag("lobia", "key"), folder);
    console.log(`Lobia | created ${created.length} Talent category folders`);
  }
  return new Map(TALENT_CATEGORIES.map(c => [c.key, byKey.get(`talent-category-${c.key}`)?.id ?? null]));
}

/** Merge by stable key; existing GM-edited documents are left alone unless overwrite is requested. */
export async function importTalents({ replace = false, overwrite = false } = {}) {
  const { pack } = await ensureTalentCompendium();
  if (!pack) throw new Error(`Lobia | Talent compendium "${talentPackId()}" unavailable`);
  if (pack.locked) await pack.configure({ locked: false });
  if (replace) {
    const ids = (await pack.getIndex()).map(doc => doc._id);
    if (ids.length) await Item.implementation.deleteDocuments(ids, { pack: pack.collection });
  }
  const folderFor = await ensureCategoryFolders(pack);
  const index = await pack.getIndex({ fields: ["flags.lobia.key", "folder"] });
  const existing = new Map(index.map(doc => [doc.flags?.lobia?.key, doc]));
  const create = [], update = [], positions = {};
  for (const talent of TALENT_CATALOGUE) {
    const sort = (positions[talent.category] = (positions[talent.category] ?? 0) + 1) * 1000;
    const flag = `talent-${talent.key}`;
    const data = {
      name: talent.name, type: "talent", sort,
      folder: folderFor.get(talent.category) ?? null,
      system: { key: talent.key, category: talent.category, effect: talent.effect },
      flags: { lobia: { key: flag } }
    };
    const found = existing.get(flag);
    if (!found) create.push(data);
    else if (overwrite) {
      const revision = { _id: found._id, ...data };
      if (found.folder) delete revision.folder;
      update.push(revision);
    }
  }
  if (create.length) await Item.implementation.createDocuments(create, { pack: pack.collection });
  if (update.length) await Item.implementation.updateDocuments(update, { pack: pack.collection });
  console.log(`Lobia | Talent import done — ${create.length} created, ${update.length} updated`);
  return { created: create.length, updated: update.length };
}

export async function refreshTalentRegistry({ rerender = true } = {}) {
  const pack = game.packs.get(talentPackId());
  if (!pack) {
    resetTalentRegistry();
    console.log("Lobia | Talent compendium unavailable — using bundled fallback");
    return;
  }
  try {
    const documents = await pack.getDocuments();
    setTalentRegistry(documents, [...pack.folders]);
    console.log(`Lobia | Talent registry loaded — ${documents.length} entries (compendium)`);
    if (rerender) {
      const loadedPokemon = game.packs.get("lobia.pokemons")?.contents ?? [];
      for (const actor of [...game.actors, ...loadedPokemon]) {
        if (actor.type !== "pokemon") continue;
        if (actor.sheet?.rendered) actor.sheet.render(false);
      }
    }
  } catch (error) {
    resetTalentRegistry();
    console.error("Lobia | Could not read Talent compendium — using bundled fallback", error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
  }
}

export async function setupTalentCompendium({ force = false } = {}) {
  if (!game.user.isGM) return refreshTalentRegistry({ rerender: false });
  const { pack, created } = await ensureTalentCompendium();
  if (!pack) return;
  const seen = game.settings.get("lobia", "talentsVersion") ?? 0;
  const count = (await pack.getIndex()).size;
  if (created || force || seen < TALENTS_VERSION) {
    console.log(`Lobia | seeding Talents v${TALENTS_VERSION} (world at v${seen}, pack holds ${count})`);
    try {
      await importTalents({ overwrite: force });
      await game.settings.set("lobia", "talentsVersion", TALENTS_VERSION);
    } catch (error) {
      console.error("Lobia | Could not seed Talent compendium", error);
      ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    }
  } else console.log(`Lobia | Talent compendium up to date (v${seen}, ${count} entries)`);
  await refreshTalentRegistry({ rerender: false });
}
