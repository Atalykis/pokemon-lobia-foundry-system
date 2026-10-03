import { pokemonSpecies, pokemonTemplateUpdates } from "../data/pokemon-species.mjs";
import { LOBIA_POKEDEX_SPECIES, POKEDEX_SPECIES } from "../data/pokemon-pokedex.mjs";
import { pokemonHpDice } from "../data/pokemon-hp.mjs";
import { pokemonIdentityUpdates } from "../data/pokemon-identity.mjs";

export const POKEMON_TEMPLATE_VERSION = 7;
const LEVEL_ZERO_VERSION = 1;
const PACK_ID = "lobia.pokemons";
const LOBIA_PROFILES = new Set(Object.values(LOBIA_POKEDEX_SPECIES));
const LG_PROFILES = new Set([...LOBIA_PROFILES, ...Object.values(POKEDEX_SPECIES).filter(species => species.division)]);
const lgType = species => species.division ? species.types[1] : species.types[0];
const versionFor = species => species.division ? POKEMON_TEMPLATE_VERSION : LOBIA_PROFILES.has(species) ? 6 : 5;
const normalizeType = name => String(name ?? "").toLocaleLowerCase("fr").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
const folderType = name => ({ electrique: "electrik" })[normalizeType(name)] ?? normalizeType(name);
const parentFolderId = document => document?._source?.folder
  ?? (typeof document?.folder === "string" ? document.folder : document?.folder?.id) ?? null;

/** Existing pack hierarchy: Type / LG. Never create a parallel top-level LG folder. */
function lgFoldersByType(pack) {
  const folders = [...pack.folders];
  const map = new Map();
  for (const root of folders.filter(folder => !parentFolderId(folder))) {
    const key = folderType(root.name);
    const lg = folders.find(folder => folder.name === "LG" && parentFolderId(folder) === root.id);
    if (lg) map.set(key, lg);
  }
  const missing = [...new Set([...LG_PROFILES].map(lgType))]
    .filter(type => !map.has(type));
  if (missing.length) throw new Error(`Missing Pokémon type/LG compendium folders: ${missing.join(", ")}`);
  return map;
}

/** A rejected update must not leave every other newly created template unprofiled. */
async function applyUpdates(pack, changes, label, names) {
  let updated = 0;
  const failed = [];
  for (let i = 0; i < changes.length; i += 10) {
    const batch = changes.slice(i, i + 10);
    try {
      const result = await Actor.implementation.updateDocuments(batch,
        { pack: pack.collection, lobiaPokemonTemplateMigration: true });
      if (result.length !== batch.length) throw new Error(`Only ${result.length} of ${batch.length} documents updated`);
      updated += batch.length;
      if ((i + batch.length) % 50 === 0 || i + batch.length === changes.length) {
        console.log(`Lobia | Pokémon ${label}: ${i + batch.length}/${changes.length} processed`);
      }
    } catch (error) {
      console.warn(`Lobia | Pokémon ${label} batch failed; retrying separately`, error);
      for (const change of batch) {
        try {
          const result = await Actor.implementation.updateDocuments([change],
            { pack: pack.collection, lobiaPokemonTemplateMigration: true });
          if (result.length !== 1) throw new Error("Document was not updated");
          updated++;
        } catch (individualError) {
          failed.push(names.get(change._id) ?? change._id);
          console.error(`Lobia | Pokémon ${label} failed for ${names.get(change._id) ?? change._id}`, individualError);
        }
      }
    }
  }
  return { updated, failed };
}

/** Seed Pokédex species in the bundled Actor pack; never touch captured world copies. */
export async function setupPokemonTemplates({ force = false } = {}) {
  if (!game.user.isGM) return;
  const pack = game.packs.get(PACK_ID);
  if (!pack) {
    console.warn(`Lobia | Pokémon template compendium "${PACK_ID}" unavailable`);
    return;
  }
  let restoredLock = false;
  try {
    const documents = await pack.getDocuments();
    const speciesFor = actor => pokemonSpecies(actor.system?.species?.name || actor.name);
    const targets = documents.filter(actor => actor.type === "pokemon" && speciesFor(actor));
    const allPokemon = documents.filter(actor => actor.type === "pokemon");
    const lgFolders = lgFoldersByType(pack);
    const accidentalRoot = [...pack.folders].find(folder => folder.name === "LG" && !parentFolderId(folder)
      && folder.getFlag("lobia", "key") === "lg");
    const existingLobia = new Set(targets.map(speciesFor));
    const missing = [...LG_PROFILES].filter(species => !existingLobia.has(species));
    if (missing.length) {
      if (pack.locked) {
        await pack.configure({ locked: false });
        restoredLock = true;
      }
      for (let i = 0; i < missing.length; i += 100) {
        const created = await Actor.implementation.createDocuments(missing.slice(i, i + 100).map(species => ({
          name: species.name, type: "pokemon", folder: lgFolders.get(lgType(species)).id,
          system: { species: { name: species.name }, identity: { nickname: species.name } }
        })), { pack: pack.collection });
        if (created.length !== Math.min(100, missing.length - i)) {
          throw new Error(`Only ${created.length} of ${Math.min(100, missing.length - i)} LG Pokémon were created`);
        }
        targets.push(...created);
        allPokemon.push(...created);
      }
    }
    const profiles = [];
    const metadata = [];
    const names = new Map(targets.map(actor => [actor.id, actor.name]));
    for (const actor of targets) {
      const species = speciesFor(actor);
      if (!species) continue;
      const isLg = LG_PROFILES.has(species);
      const needsProfile = force || (actor.getFlag("lobia", "speciesTemplateVersion") ?? 0) < versionFor(species);
      const identityUpdates = pokemonIdentityUpdates(actor, species.name);
      const clearedAccelerators = Object.fromEntries(Object.keys(actor.system.accelerators ?? {})
        .map(id => [`system.accelerators.-=${id}`, null]));
      const acceleratorHp = Object.values(actor.system.accelerators ?? {})
        .reduce((sum, entry) => sum + (Number(entry?.hp) || 0), 0);
      const targetFolder = isLg ? lgFolders.get(lgType(species)) : null;
      const needsFolder = isLg && parentFolderId(actor) !== targetFolder.id;
      if (needsProfile) {
        const clearedBranches = Object.fromEntries(Object.keys(actor.system.pokemonTrees ?? {})
          .map(branch => [`system.pokemonTrees.-=${branch}`, null]));
        const clearedRolls = Object.fromEntries(Object.keys(actor.system.pokemonTreeRolls ?? {})
          .map(key => [`system.pokemonTreeRolls.-=${key}`, null]));
        profiles.push({ _id: actor.id, ...pokemonTemplateUpdates(species), ...identityUpdates,
          ...clearedAccelerators,
          ...clearedBranches, ...clearedRolls,
          "flags.lobia.speciesTemplateVersion": versionFor(species),
          "flags.lobia.levelZeroVersion": LEVEL_ZERO_VERSION });
      }
      const needsArtwork = isLg && species.image
        && (force || !(actor.getFlag("lobia", "lgArtworkVersion") ?? 0));
      // Upgrade old formula text without re-applying a profile and overwriting GM edits.
      const savedFormula = actor._source?.system?.species?.hpFormula ?? actor.system?.species?.hpFormula;
      const dice = pokemonHpDice(savedFormula) ?? (/^\d+$/.test(String(savedFormula ?? "").trim()) ? "" : null);
      const needsFormula = !needsProfile && dice !== null && savedFormula !== dice;
      const needsLevelZero = (actor.getFlag("lobia", "levelZeroVersion") ?? 0) < LEVEL_ZERO_VERSION
        && !needsProfile;
      if (needsFolder || needsArtwork || needsFormula || needsLevelZero
        || (!needsProfile && (Object.keys(identityUpdates).length || Object.keys(clearedAccelerators).length))) {
        metadata.push({ _id: actor.id, ...(!needsProfile ? { ...identityUpdates, ...clearedAccelerators,
          ...(acceleratorHp > 0 ? { "system.hp.base": Math.max(0, actor.system.hp.base - acceleratorHp),
            "system.hp.value": Math.max(0, actor.system.hp.value - acceleratorHp) } : {}) } : {}),
          ...(needsLevelZero ? { "system.identity.level": 0,
            "flags.lobia.levelZeroVersion": LEVEL_ZERO_VERSION } : {}),
          ...(needsFolder ? { folder: targetFolder.id } : {}),
          ...(needsFormula ? { "system.species.hpFormula": dice } : {}),
          ...(needsArtwork ? { img: species.image, "prototypeToken.texture.src": species.image,
            "flags.lobia.lgArtworkVersion": 1 } : {}) });
      }
    }
    // Also update unprofiled Pokémon in the pack without replacing their custom stats or HP.
    for (const actor of allPokemon) {
      if (speciesFor(actor)) continue;
      const identityUpdates = pokemonIdentityUpdates(actor);
      const clearedAccelerators = Object.fromEntries(Object.keys(actor.system.accelerators ?? {})
        .map(id => [`system.accelerators.-=${id}`, null]));
      const acceleratorHp = Object.values(actor.system.accelerators ?? {})
        .reduce((sum, entry) => sum + (Number(entry?.hp) || 0), 0);
      const needsLevelZero = (actor.getFlag("lobia", "levelZeroVersion") ?? 0) < LEVEL_ZERO_VERSION;
      if (needsLevelZero || Object.keys(identityUpdates).length || Object.keys(clearedAccelerators).length) metadata.push({ _id: actor.id,
        ...identityUpdates, ...clearedAccelerators,
        ...(acceleratorHp > 0 ? { "system.hp.base": Math.max(0, actor.system.hp.base - acceleratorHp),
          "system.hp.value": Math.max(0, actor.system.hp.value - acceleratorHp) } : {}),
        ...(needsLevelZero ? { "system.identity.level": 0,
          "flags.lobia.levelZeroVersion": LEVEL_ZERO_VERSION } : {}) });
    }
    if ((profiles.length || metadata.length) && pack.locked) {
      await pack.configure({ locked: false });
      restoredLock = true;
    }
    console.log(`Lobia | Pokémon Pokédex import: ${missing.length} missing, ${profiles.length} profiles, ${metadata.length} metadata updates`);
    const profileResult = await applyUpdates(pack, profiles, "profile", names);
    const metadataResult = await applyUpdates(pack, metadata, "metadata", names);
    if (accidentalRoot && !metadataResult.failed.length) {
      const remaining = (await pack.getDocuments()).filter(actor => parentFolderId(actor) === accidentalRoot.id);
      if (!remaining.length) {
        if (pack.locked) {
          await pack.configure({ locked: false });
          restoredLock = true;
        }
        await Folder.implementation.deleteDocuments([accidentalRoot.id], { pack: pack.collection });
        console.log("Lobia | Removed the empty accidental top-level LG folder");
      }
    }
    const failures = [...profileResult.failed, ...metadataResult.failed];
    console.log(`Lobia | Pokémon Pokédex templates: ${missing.length} LG created, ${profileResult.updated} profiles and ${metadataResult.updated} metadata updates, ${failures.length} failures`);
    if (failures.length) {
      ui.notifications.error(`Lobia | Pokémon templates failed: ${[...new Set(failures)].join(", ")}`);
    }
  } catch (error) {
    console.error("Lobia | Could not update Pokémon Pokédex templates", error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
  } finally {
    if (restoredLock) {
      try { await pack.configure({ locked: true }); }
      catch (error) { console.error("Lobia | Could not re-lock Pokémon template compendium", error); }
    }
  }
}
