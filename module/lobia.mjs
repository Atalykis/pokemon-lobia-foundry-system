import { LOBIA } from "./config.mjs";
import LobiaPokemon from "./data/actor-pokemon.mjs";
import LobiaTrainer from "./data/actor-trainer.mjs";
import LobiaObjet from "./data/item-objet.mjs";
import LobiaCompetence from "./data/item-competence.mjs";
import LobiaCapacite from "./data/item-capacite.mjs";
import LobiaArbre from "./data/item-arbre.mjs";
import LobiaArbreDominant from "./data/item-arbre-dominant.mjs";
import LobiaNature from "./data/item-nature.mjs";
import LobiaTalent from "./data/item-talent.mjs";
import LobiaActor from "./documents/actor.mjs";
import LobiaItem from "./documents/item.mjs";
import LobiaActorSheet from "./sheets/actor-sheet.mjs";
import LobiaTrainerSheet from "./sheets/trainer-sheet.mjs";
import LobiaItemSheet from "./sheets/item-sheet.mjs";
import LobiaCompetenceSheet from "./sheets/competence-sheet.mjs";
import LobiaCapaciteSheet from "./sheets/capacite-sheet.mjs";
import LobiaArbreSheet from "./sheets/arbre-sheet.mjs";
import LobiaArbreDominantSheet from "./sheets/arbre-dominant-sheet.mjs";
import LobiaNatureSheet from "./sheets/nature-sheet.mjs";
import LobiaTalentSheet from "./sheets/talent-sheet.mjs";
import { setupItemCompendium, ensureItemCompendium, importItems, CATALOGUE_VERSION } from "./packs/item-pack.mjs";
import {
  setupSkillCompendium, importSkills, importTrees, refreshSkillRegistry,
  isSkillDocument, SKILLS_VERSION
} from "./packs/skill-pack.mjs";
import { cleanupGeneratedGuide, ensureRulebookPack } from "./packs/rulebook.mjs";
import { setupWeatherJournal } from "./packs/weather-journal.mjs";
import { registerLobiaWeather, addWeatherControl } from "./canvas/weather.mjs";
import { allowCompendiumActorCopies } from "./actor-directory-drop.mjs";
import { setupPokemonTemplates, POKEMON_TEMPLATE_VERSION } from "./packs/pokemon-template-pack.mjs";
import { migrateWorldPokemonIdentity } from "./data/pokemon-identity.mjs";
import {
  setupMoveCompendium, ensureMoveCompendium, importMoves, refreshMoveRegistry,
  isMoveDocument, MOVES_VERSION
} from "./packs/move-pack.mjs";
import { quickRoll, setupQuickRollMacro } from "./macros/quick-roll.mjs";
import { rollMetronome, setupMetronomeMacro } from "./macros/metronome.mjs";
import { showTypeChart, setupTypeChartMacro } from "./macros/type-chart.mjs";
import { resetCombatStyleOnTurnChange, resetCombatStylesOnDelete } from "./combat/style-turn.mjs";
import { LOBIA_STATUSES } from "./data/statuses.mjs";
import { ITEM_CATALOGUE } from "./packs/items-data.mjs";
import {
  setupNatureCompendium, ensureNatureCompendium, importNatures, refreshNatureRegistry,
  isNatureDocument, NATURES_VERSION
} from "./packs/nature-pack.mjs";
import {
  setupTalentCompendium, ensureTalentCompendium, importTalents, refreshTalentRegistry,
  isTalentDocument, TALENTS_VERSION
} from "./packs/talent-pack.mjs";
import {
  setupDominantTreeCompendium, ensureDominantTreeCompendium, importDominantTrees,
  refreshDominantTreeRegistry, isDominantTreeDocument, DOMINANT_TREES_VERSION
} from "./packs/dominant-tree-pack.mjs";

Hooks.once("init", () => {
  console.log("Lobia | Initializing the Pokémon Lobia system");

  CONFIG.LOBIA = LOBIA;
  registerLobiaWeather();
  for (const status of LOBIA_STATUSES) {
    if (!CONFIG.statusEffects.some(effect => effect.id === status.id)) {
      CONFIG.statusEffects.push({ id: status.id, name: `LOBIA.Status.${status.key}.name`, img: status.img });
    }
  }

  // Document classes
  CONFIG.Actor.documentClass = LobiaActor;
  CONFIG.Item.documentClass = LobiaItem;
  allowCompendiumActorCopies();

  // Data models (schema per subtype)
  CONFIG.Actor.dataModels.pokemon = LobiaPokemon;
  CONFIG.Actor.dataModels.trainer = LobiaTrainer;
  CONFIG.Item.dataModels.objet = LobiaObjet;
  CONFIG.Item.dataModels.competence = LobiaCompetence;
  CONFIG.Item.dataModels.capacite = LobiaCapacite;
  CONFIG.Item.dataModels.arbre = LobiaArbre;
  CONFIG.Item.dataModels.arbreDominant = LobiaArbreDominant;
  CONFIG.Item.dataModels.nature = LobiaNature;
  CONFIG.Item.dataModels.talent = LobiaTalent;

  // Which catalogue version this world has imported (0 = never). Deliberately a
  // version rather than a done/not-done flag, so a deleted pack can be rebuilt.
  // Which bundled skill data this world has seeded (0 = never).
  game.settings.register("lobia", "skillsVersion", {
    name: "LOBIA.Settings.skillsVersion",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("lobia", "catalogueVersion", {
    name: "LOBIA.Settings.catalogueVersion",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("lobia", "customItemCategories", {
    name: "LOBIA.Item.customCategories",
    scope: "world", config: false, type: Array, default: [],
    onChange: () => {
      for (const sheet of Object.values(ui.windows ?? {})) {
        if (sheet instanceof LobiaTrainerSheet || sheet instanceof LobiaItemSheet) sheet.render();
      }
    }
  });

  game.settings.register("lobia", "itemCategoryLabels", {
    name: "LOBIA.Item.categoryLabels",
    scope: "world", config: false, type: Object, default: {},
    onChange: () => {
      for (const sheet of Object.values(ui.windows ?? {})) {
        if (sheet instanceof LobiaTrainerSheet || sheet instanceof LobiaItemSheet) sheet.render();
      }
    }
  });

  game.settings.register("lobia", "itemCategorySubcategories", {
    name: "LOBIA.Item.subcategorySettings",
    scope: "world", config: false, type: Object, default: {},
    onChange: () => {
      for (const sheet of Object.values(ui.windows ?? {})) {
        if (sheet instanceof LobiaTrainerSheet || sheet instanceof LobiaItemSheet) sheet.render();
      }
    }
  });

  game.settings.register("lobia", "naturesVersion", {
    name: "LOBIA.Settings.naturesVersion",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("lobia", "talentsVersion", {
    name: "LOBIA.Settings.talentsVersion",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("lobia", "movesVersion", {
    name: "LOBIA.Settings.movesVersion",
    scope: "world", config: false, type: Number, default: 0
  });

  game.settings.register("lobia", "dominantTreesVersion", {
    name: "LOBIA.Settings.dominantTreesVersion",
    scope: "world", config: false, type: Number, default: 0
  });

  // Shared Handlebars partials (used by several sheet parts).
  foundry.applications.handlebars.loadTemplates({
    lobiaStatBlock: "systems/lobia/templates/actor/parts/stat-block.hbs",
    lobiaDerivedBlock: "systems/lobia/templates/actor/parts/derived-block.hbs"
  });

  // Sheets (ApplicationV2)
  const { DocumentSheetConfig } = foundry.applications.apps;

  DocumentSheetConfig.registerSheet(Actor, "lobia", LobiaActorSheet, {
    types: ["pokemon"],
    makeDefault: true,
    label: "LOBIA.SheetLabels.Pokemon"
  });

  DocumentSheetConfig.registerSheet(Actor, "lobia", LobiaTrainerSheet, {
    types: ["trainer"],
    makeDefault: true,
    label: "LOBIA.SheetLabels.Trainer"
  });

  DocumentSheetConfig.registerSheet(Item, "lobia", LobiaItemSheet, {
    types: ["objet"],
    makeDefault: true,
    label: "LOBIA.SheetLabels.Item"
  });

  DocumentSheetConfig.registerSheet(Item, "lobia", LobiaCompetenceSheet, {
    types: ["competence"],
    makeDefault: true,
    label: "LOBIA.SheetLabels.Competence"
  });

  DocumentSheetConfig.registerSheet(Item, "lobia", LobiaCapaciteSheet, {
    types: ["capacite"], makeDefault: true, label: "LOBIA.SheetLabels.Capacite"
  });

  DocumentSheetConfig.registerSheet(Item, "lobia", LobiaArbreSheet, {
    types: ["arbre"],
    makeDefault: true,
    label: "LOBIA.SheetLabels.Arbre"
  });

  DocumentSheetConfig.registerSheet(Item, "lobia", LobiaArbreDominantSheet, {
    types: ["arbreDominant"], makeDefault: true, label: "LOBIA.SheetLabels.ArbreDominant"
  });

  DocumentSheetConfig.registerSheet(Item, "lobia", LobiaNatureSheet, {
    types: ["nature"],
    makeDefault: true,
    label: "LOBIA.SheetLabels.Nature"
  });

  DocumentSheetConfig.registerSheet(Item, "lobia", LobiaTalentSheet, {
    types: ["talent"],
    makeDefault: true,
    label: "LOBIA.SheetLabels.Talent"
  });
});

Hooks.once("ready", async () => {
  // Exposed before the run so it is reachable even if setup itself fails:
  //   game.lobia.setupItems({force: true})   rebuild / refill the compendium
  //   game.lobia.importItems()               re-import the catalogue by hand
  game.lobia = {
    ...(game.lobia ?? {}),
    setupItems: setupItemCompendium,
    setupSkills: setupSkillCompendium,
    setupMoves: setupMoveCompendium,
    ensureMoveCompendium,
    importMoves,
    refreshMoveRegistry,
    MOVES_VERSION,
    importSkills,
    importTrees,
    refreshSkillRegistry,
    cleanupGeneratedGuide,
    setupWeatherJournal,
    ensureRulebookPack,
    SKILLS_VERSION,
    ensureItemCompendium,
    importItems,
    ITEM_CATALOGUE,
    CATALOGUE_VERSION,
    setupNatures: setupNatureCompendium,
    ensureNatureCompendium,
    importNatures,
    refreshNatureRegistry,
    NATURES_VERSION,
    setupTalents: setupTalentCompendium,
    ensureTalentCompendium,
    importTalents,
    refreshTalentRegistry,
    TALENTS_VERSION,
    setupDominantTrees: setupDominantTreeCompendium,
    ensureDominantTreeCompendium,
    importDominantTrees,
    refreshDominantTreeRegistry,
    DOMINANT_TREES_VERSION,
    setupPokemonTemplates,
    POKEMON_TEMPLATE_VERSION,
    quickRoll,
    setupQuickRollMacro,
    rollMetronome,
    setupMetronomeMacro,
    showTypeChart,
    setupTypeChartMacro
  };
  await setupItemCompendium();
  await setupSkillCompendium();
  await setupMoveCompendium();
  await setupNatureCompendium();
  await setupTalentCompendium();
  await setupDominantTreeCompendium();
  await setupPokemonTemplates();
  await migrateWorldPokemonIdentity();
  await cleanupGeneratedGuide();
  await setupWeatherJournal();
  await setupQuickRollMacro();
  await setupMetronomeMacro();
  await setupTypeChartMacro();
});

// Editing a skill or a tree in the compendium updates the trainer sheets immediately.
// Debounced: a bulk import fires this hook once per document (216 on a first seed),
// and the registry only needs rebuilding once the dust settles.
let registryReload = null;
let natureReload = null;
let talentReload = null;
let moveReload = null;
let dominantTreeReload = null;
function scheduleDominantTreeRefresh() {
  clearTimeout(dominantTreeReload);
  dominantTreeReload = setTimeout(() => refreshDominantTreeRegistry(), 200);
}
function scheduleMoveRefresh() {
  clearTimeout(moveReload);
  moveReload = setTimeout(() => refreshMoveRegistry(), 200);
}
function scheduleTalentRefresh() {
  clearTimeout(talentReload);
  talentReload = setTimeout(() => refreshTalentRegistry(), 200);
}
function scheduleNatureRefresh() {
  clearTimeout(natureReload);
  natureReload = setTimeout(() => refreshNatureRegistry(), 200);
}
function scheduleRegistryRefresh() {
  clearTimeout(registryReload);
  registryReload = setTimeout(async () => {
    await refreshSkillRegistry();
  }, 200);
}

for (const hook of ["createItem", "updateItem", "deleteItem"]) {
  Hooks.on(hook, (item) => {
    if (isSkillDocument(item)) scheduleRegistryRefresh();
    if (isNatureDocument(item)) scheduleNatureRefresh();
    if (isTalentDocument(item)) scheduleTalentRefresh();
    if (isMoveDocument(item)) scheduleMoveRefresh();
    if (isDominantTreeDocument(item)) scheduleDominantTreeRefresh();
  });
}

Hooks.on("combatTurnChange", resetCombatStyleOnTurnChange);
Hooks.on("deleteCombat", resetCombatStylesOnDelete);
Hooks.on("getSceneControlButtons", addWeatherControl);
