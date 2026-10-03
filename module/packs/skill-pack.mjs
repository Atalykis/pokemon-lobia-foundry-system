import { LOBIA } from "../config.mjs";
import { SKILLS } from "../data/skills-data.mjs";
import { TREE_LABELS } from "../data/trees-data.mjs";
import { LEGACY_SKILL_KEYS } from "../data/skill-key-migrations.mjs";
import { setRegistryFromDocuments, resetRegistry, registrySource } from "../data/skill-registry.mjs";

/**
 * Two GM-owned world compendia back the trainer skill tree:
 *
 *  - **Compétences Dresseur** — 198 "competence" items, one folder per type.
 *  - **Arbres Dresseur**      — 18 "arbre" items, one per type, flat.
 *
 * Both are seeded from the bundled xlsx data and then edited freely in Foundry. The
 * trainer sheet never reads either pack directly; it reads the in-memory registry,
 * which is rebuilt from both packs here.
 */

/** Bump when the bundled skill data changes and every world should pick it up. */
export const SKILLS_VERSION = 2;

const log = (...args) => console.log("Lobia |", ...args);

export function skillPackId() {
  return `world.${LOBIA.skillPack.name}`;
}

export function treePackId() {
  return `world.${LOBIA.treePack.name}`;
}

/** Is this document one of ours, in one of our two packs? */
export function isSkillDocument(doc) {
  if (!doc) return false;
  if ((doc.pack !== skillPackId()) && (doc.pack !== treePackId())) return false;
  return (doc.type === "competence") || (doc.type === "arbre");
}

/**
 * Return one of our compendia, creating it if the world does not have it.
 * @param {{name: string, label: string}} config
 * @returns {Promise<{pack: CompendiumCollection|null, created: boolean}>}
 */
async function ensurePack({ name, label }) {
  const collection = `world.${name}`;
  if (!game.user.isGM) return { pack: game.packs.get(collection) ?? null, created: false };

  const existing = game.packs.get(collection);
  if (existing) return { pack: existing, created: false };

  log(`compendium "${collection}" not found — creating it`);
  try {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      name, label, type: "Item"
    });
    if (!pack) throw new Error("createCompendium returned nothing");
    log(`created compendium "${pack.collection}"`);
    ui.notifications.info(game.i18n.format("LOBIA.Item.packCreated", { label }));
    return { pack, created: true };
  } catch (err) {
    console.error(`Lobia | Could not create the compendium "${collection}"`, err);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: err.message }));
    return { pack: null, created: false };
  }
}

export const ensureSkillCompendium = () => ensurePack(LOBIA.skillPack);
export const ensureTreeCompendium = () => ensurePack(LOBIA.treePack);

/** One folder per type in the skills pack, matched by a `lobia.key` flag so renames survive. */
async function ensureTypeFolders(pack, types) {
  const byKey = new Map();
  for (const folder of pack.folders) {
    const key = folder.getFlag("lobia", "key");
    if (key) byKey.set(key, folder);
  }

  const ordered = Object.keys(LOBIA.types).filter(t => types.has(t));
  const missing = ordered
    .filter(t => !byKey.has(`type-${t}`))
    .map(t => ({
      name: game.i18n.localize(LOBIA.types[t]),
      type: "Item",
      sorting: "m",
      sort: (ordered.indexOf(t) + 1) * 1000,
      folder: null,
      flags: { lobia: { key: `type-${t}` } }
    }));
  if (missing.length) {
    log(`creating ${missing.length} type folders`);
    for (const folder of await Folder.implementation.createDocuments(missing, { pack: pack.collection })) {
      byKey.set(folder.getFlag("lobia", "key"), folder);
    }
  }

  const map = new Map();
  for (const t of ordered) {
    const folder = byKey.get(`type-${t}`);
    if (folder) map.set(t, folder.id);
  }
  return map;
}

/**
 * Write entries into a pack, matching on the `lobia.key` flag so a renamed document is
 * updated rather than duplicated, and a GM's own foldering is preserved.
 * @returns {Promise<{created: number, updated: number}>}
 */
async function writeEntries(pack, entries, {
  replace = false, keyAliases = {}, deleteSystemFields = []
} = {}) {
  if (pack.locked) await pack.configure({ locked: false });

  if (replace) {
    const ids = (await pack.getIndex()).map(i => i._id);
    if (ids.length) await Item.implementation.deleteDocuments(ids, { pack: pack.collection });
  }

  const index = await pack.getIndex({ fields: ["flags.lobia.key", "folder"] });
  const existing = new Map();
  for (const entry of index) {
    const key = entry.flags?.lobia?.key;
    if (key) existing.set(keyAliases[key] ?? key, entry);
  }

  const toCreate = entries.filter(e => !existing.has(e.flags.lobia.key));
  const toUpdate = entries
    .filter(e => existing.has(e.flags.lobia.key))
    .map(e => {
      const entry = existing.get(e.flags.lobia.key);
      const update = { _id: entry._id, ...e };
      if (entry.folder) delete update.folder;
      for (const field of deleteSystemFields) update[`system.-=${field}`] = null;
      return update;
    });

  if (toCreate.length) await Item.implementation.createDocuments(toCreate, { pack: pack.collection });
  if (toUpdate.length) await Item.implementation.updateDocuments(toUpdate, { pack: pack.collection });
  return { created: toCreate.length, updated: toUpdate.length };
}

/** Seed the 198 skills into Compétences Dresseur, foldered by type. */
export async function importSkills(options = {}) {
  const { pack } = await ensureSkillCompendium();
  if (!pack) throw new Error("Lobia | The skill compendium is not available");

  const folderFor = await ensureTypeFolders(pack, new Set(SKILLS.map(s => s.type)));
  const typePosition = {};
  const entries = SKILLS.map(s => {
    const position = (typePosition[s.type] = (typePosition[s.type] ?? 0) + 1);
    return {
      name: s.name,
      type: "competence",
      folder: folderFor.get(s.type) ?? null,
      sort: position * 1000,
      system: { key: s.key, type: s.type, category: s.category, tiers: { ...s.tiers } },
      flags: { lobia: { key: s.key } }
    };
  });

  const result = await writeEntries(pack, entries, {
    ...options,
    keyAliases: LEGACY_SKILL_KEYS,
    deleteSystemFields: ["col"]
  });
  log(`skill import done — ${result.created} created, ${result.updated} updated`);
  return result;
}

/** Seed the 18 type trees into Arbres Dresseur (flat — one entry per type). */
export async function importTrees(options = {}) {
  const { pack } = await ensureTreeCompendium();
  if (!pack) throw new Error("Lobia | The tree compendium is not available");

  const order = Object.keys(LOBIA.types);
  const entries = Object.entries(TREE_LABELS).map(([type, labels]) => ({
    name: game.i18n.format("LOBIA.Tree.itemName", { type: game.i18n.localize(LOBIA.types[type]) }),
    type: "arbre",
    sort: (order.indexOf(type) + 1) * 1000,
    system: { type, labels: { ...labels } },
    flags: { lobia: { key: `arbre-${type}` } }
  }));

  const result = await writeEntries(pack, entries, options);
  log(`tree import done — ${result.created} created, ${result.updated} updated`);
  return result;
}

/**
 * Load both compendia into the in-memory registry the sheets read from, then refresh
 * anything already on screen.
 */
export async function refreshSkillRegistry({ rerender = true } = {}) {
  const docs = [];
  for (const id of [skillPackId(), treePackId()]) {
    const pack = game.packs.get(id);
    if (pack) docs.push(...await pack.getDocuments());
  }

  resetRegistry();
  const { skills, trees } = setRegistryFromDocuments(docs);
  const src = registrySource();
  log(`registry loaded — ${skills} skills (${src.skills}), ${trees} trees (${src.labels})`);

  if (!rerender) return;
  // Tree bonuses are applied during data preparation, so actors must be re-prepared.
  for (const actor of game.actors) {
    if (actor.type !== "trainer") continue;
    actor.prepareData();
    if (actor.sheet?.rendered) actor.sheet.render(false);
  }
}

/**
 * First launch: create both compendia, seed them, and load the registry.
 * @param {object} [options]
 * @param {boolean} [options.force=false]  Re-seed regardless of version/contents.
 */
export async function setupSkillCompendium({ force = false } = {}) {
  if (!game.user.isGM) { await refreshSkillRegistry({ rerender: false }); return; }

  const skills = await ensureSkillCompendium();
  const trees = await ensureTreeCompendium();
  if (!skills.pack || !trees.pack) return;

  const seen = game.settings.get("lobia", "skillsVersion") ?? 0;
  const sizes = {
    skills: (await skills.pack.getIndex()).size,
    trees: (await trees.pack.getIndex()).size
  };
  const created = skills.created || trees.created;

  if (force || created || (seen < SKILLS_VERSION)) {
    log(`seeding skills v${SKILLS_VERSION} (world at v${seen}, packs hold ${sizes.skills}/${sizes.trees})`);
    try {
      const s = await importSkills();
      const t = await importTrees();
      await game.settings.set("lobia", "skillsVersion", SKILLS_VERSION);
      ui.notifications.info(game.i18n.format("LOBIA.Tree.packFilled", {
        count: s.created + s.updated + t.created + t.updated,
        label: `${LOBIA.skillPack.label} / ${LOBIA.treePack.label}`
      }));
    } catch (err) {
      console.error("Lobia | Could not seed the skill compendia", err);
      ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: err.message }));
    }
  } else if ((sizes.skills === 0) && (sizes.trees === 0)) {
    log(`skill compendia are empty but already at v${seen} — leaving them alone `
      + "(run game.lobia.setupSkills({force: true}) to refill them)");
  } else {
    log(`skill compendia up to date (v${seen}, ${sizes.skills} skills, ${sizes.trees} trees)`);
  }

  await refreshSkillRegistry({ rerender: false });
}
