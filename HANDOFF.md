# Lobia — FoundryVTT System Handoff

A transmission document for an agent continuing development of the **Pokémon Lobia** TTRPG system for Foundry VTT. Read this top-to-bottom before touching code.

**Next-session starting point:** Pokémon **PV +** now rolls the `Niv(…)` dice in the actor's saved species HP formula once per unlocked cell (Férosinge `10 + Niv(2D4)` → `2d4`). Rolls live in `system.pokemonTreeRolls`, increase current/max HP, and are refunded on lock/cascade/reset. Previously unlocked PV + cells show a one-time roll button. See `module/data/pokemon-hp.mjs` and `tools/test/pokemonhpcheck.mjs`. The Principal tab now offers visible radio choices for the Pokémon's one to three Talents; the old hidden-Talent field is removed. `~/Downloads/Pokedex Lobia.xlsx` provides 230 complete species and 459 branches; incomplete entries were excluded. The GM-load seeder places them by primary type in the **existing type → LG subfolders** of `lobia.pokemons` and can clean up the accidental empty top-level LG folder. Across 11 workbooks there are **1,271 species** and **2,534 tree branches**. The live `Data/worlds/lobia` world still uses Simple World-Building; a converted trial is `Data/worlds/lobia-migration-trial`, with pre-migration archive `Backups/worlds/lobia/lobia-pre-migration-2026-09-27.tar.gz`. Never edit LevelDB while Foundry runs. The bundled `lobia.pokemons` pack is the species template source; GM copies an actor to the world, then the player rolls individual traits. Workbook **cell comments** define evolution and node restrictions. Verify changes with §10.

**Guide update:** On the next GM load, `cleanupGeneratedGuide()` removes the old Trainer skill/tree chapters from `world.guide-dresseur`. A chapter with GM-written pages keeps those pages and becomes an authored entry; the Météo journal and unrelated entries are untouched. No skill edits regenerate the old chapters. See §5 and `tools/test/rulebooktest.mjs`.

---

## 1. What this is

A **custom FoundryVTT game system** (`id: "lobia"`) implementing a homemade, Pokémon-themed tabletop RPG. Built fresh (not a fork). The owner's live world runs on the stock **Simple World-Building** system today; the long-term plan is to migrate that world onto this system.

- **Foundry version: v13.351.** Build natively for v13 — **DataModels** (`foundry.abstract.TypeDataModel`) + **ApplicationV2** sheets. Do NOT use legacy `ActorSheet`/`template.json`-schema patterns.
- **Core dice mechanic: d100 roll-under.** Roll `1d100` ≤ stat = success. **≤ 5 = Critical Success, ≥ 96 = Critical Failure** (constants in `module/config.mjs` → `LOBIA.crit`).
- **Primary language: French** (`lang/fr.json` is authoritative; `lang/en.json` mirrors it). Stat/field keys are French words (attaque, vitesse, …).

### Paths
- System dir: `/home/atalykis/.local/share/foundryvtt/Data/systems/lobia/`
- Foundry data root: `/home/atalykis/.local/share/foundryvtt/`
- **Unminified Foundry source (invaluable for API checks):** `~/Downloads/FoundryVTT-Node-13.351/client/` (and `common/`). Grep it to confirm any API before using it.
- Source rules spreadsheet: `~/Downloads/Compétences de Dresseur.xlsx`
- Item/Talent workbooks: `~/Downloads/Objects.xlsx`, `~/Downloads/Talents.xlsx`
- Pokémon Pokédex workbooks: `~/Downloads/Pokedex Kanto.xlsx` and nine regional `.xlsx` files in `~/Downloads/Pokedex/` (1,041 entries total).
- Worlds: `Data/worlds/lobia/` is the live Simple World-Building world; `Data/worlds/test/` runs this Lobia system. The bundled Pokémon pack is `Data/systems/lobia/packs/pokemons/`.

---

## 2. Current status

**Done:** the Trainer actor is feature-complete. The Pokémon actor has Principal, Statistiques and Arbre de compétences tabs, editable identity/level, action resources, one/two-type selection, a defensive header, a 1d100 Nature mechanic, rolled measurements, and global GM-editable Natures and Talents. Ten Pokédex workbooks provide 1,041 species templates and their family trees; Pokémon move effects remain to build.

- Actor types `trainer`, `pokemon`. Item types `objet`, `competence`, `arbre`, `nature`, `talent`.
- d100 stat rolls (click a stat → chat card with crit bands), rolled against the stat **total**.
- Four-tab trainer sheet: **Principal / Statistiques / Arbre de compétences / Inventaire**.
- Stats and Modificateurs both render as **Base + Modif. = Total** cards.
- Skill tree: 4 branches, points, prerequisites — **and GM-editable from compendia**.
- Inventory: 3 weapon slots (each with an accessory) + uncapped buckets, on real embedded Items.
- **Pokémons** system compendium (`lobia.pokemons`): 1,127 converted Pokémon actors in 203 type → generation folders. Every document is `type: "pokemon"` and opens with the Lobia Pokémon sheet.
- **Shared hotbar Macros** (world Macros created once on GM ready): Lobia — Jets rapides, Lobia — Métronome and Lobia — Table des types. The type chart uses `attackMultiplier` from `module/data/type-chart.mjs`, the same effectiveness data as actor defensive profiles; see `module/macros/` and `tools/test/typechartcheck.mjs`.
- **Combat styles (both actors):** the shared header selects Neutre, Dévastateur, Puissant, Rapide or Défensif (`system.combatStyle`). Stat changes are prepared by `actor-base.mjs` before derived values and layer with Pokémon Nature. Dévastateur (−25 Attack/Special Attack; area attacks) and Rapide (+25 Attack/Special Attack, −25 Defense/Special Defense) reset to Neutre at turn end (`module/combat/style-turn.mjs`); Puissant doubles dealt/received damage; Défensif halves dealt damage and grants narrative immunity to Stat-class moves. The quick-roll Macro applies outgoing multipliers, while incoming damage and move targeting have no automatic resolution pipeline yet. Test with `node tools/test/combatstylecheck.mjs`.
- **Manual statuses (both actors):** the shared header offers 16 TTRPG statuses with RP-selected levels 1–4. Each status is a single Actor `ActiveEffect` with a `lobia-*` status ID, icon from `CONFIG.statusEffects`, and `flags.lobia.{status,level}`; Foundry mirrors the icon onto dependent tokens. A player with OWNER permission can add, change level or remove it. The localized rule appears on hover, with `X` replaced by the chosen level in `XD4/6/8`. Damage, debuffs, action denial, duration and K.O are descriptive/manual for now; there is no status DataModel or automatic effects. See `module/data/statuses.mjs`, `LobiaActor.setLobiaStatus/removeLobiaStatus`, and `node tools/test/statuscheck.mjs`.
- **GM-owned world compendia**, created and seeded on first GM launch (the separate `lobia.pokemons` system pack is bundled, not seeded into the world):

| Compendium | Contents |
| --- | --- |
| **Objets** (`world.objets`) | 146 `objet` Items, 25 category → subcategory folders |
| **Compétences Dresseur** (`world.competences-dresseur`) | 198 `competence` Items, 18 type folders |
| **Arbres Dresseur** (`world.arbres-dresseur`) | 18 `arbre` Items, flat |
| **Natures Pokémon** (`world.natures-pokemon`) | 25 `nature` Items, editable names, 1d100 ranges and five stat adjustments; players: OBSERVER |
| **Talents Pokémon** (`world.talents-pokemon`) | 374 `talent` Items, 17 category folders described from the workbook; players: OBSERVER |
| **Guide du Dresseur** (`world.guide-dresseur`) | Authored reference JournalEntries such as **Météo** (17 pages); players: OBSERVER. Old Trainer chapters are cleaned up on GM load. |

**Not done / next:** Pokémon-specific move/skill effects and migration of the rest of the live Simple World-Building world. Pokémon **level is already present** (1–20). The owner described a future Pokémon skills workbook with one sheet per type and Name / Type / Class / Damage / Contact / Description; inspect the actual source before designing its importer. Do not reuse Trainer skills or their tree topology by assumption.

The converted Pokémon retain their original image paths (`JDR/PokemonLobia/Pokemons/...`), but that asset tree was not present under the Foundry Data directory when the pack was built. Check whether the files have since been restored; if not, restoring the tree at the same relative path reconnects portraits/tokens without rebuilding the pack. No secondary types were inferred from the source: the root type folder became primary, secondary remains blank.

---

## 3. Data model

### Actors
Registered in `module/lobia.mjs` init: `CONFIG.Actor.dataModels.{pokemon,trainer}`, `CONFIG.Actor.documentClass = LobiaActor`.

**Base (`module/data/actor-base.mjs`, both types):**
- `system.stats`: 5 battle stats, each stored as `{base, mod}` — `attaque(65)`, `attaqueSpeciale(35)`, `defense(55)`, `defenseSpeciale(35)`, `vitesse(35)`. `base` is 0–100, `mod` is an unbounded signed integer. The base model computes `total = base + mod`; Pokémon then add their Nature bonus (never stored in `total`). `static migrateData` promotes legacy scalar stats (`attaque: 65`) to `{base:65, mod:0}`.
- `system.hp`: stored `{value, base}` plus prepared `bonus`/`max`. Trainer bonus sums `treeRolls`; Pokémon bonus sums separate `pokemonTreeRolls` from PV + nodes. `max = base + bonus`; prepared `{value, max}` satisfies `primaryTokenAttribute = hp`. `migrateData` converts formerly stored `max` to `base` and subtracts either kind of rolled bonus to avoid double-counting.
- `system.battle`: action economy, each `{value, max}` init 1 — `deplacement`, `action`, `actionBonus`, `reaction`. `max` is the editable base allotment; `value` is the amount currently remaining.
- `system.notes`: HTMLField.
- `system.derivedMods`: manual modifiers on the derived values — integers, may be negative, one per `LobiaActorBase.DERIVED_KEYS` entry. For effects the system cannot work out by itself (usable objects, skills).
- `prepareDerivedData` computes `system.derived` (displayed as **"Modificateur"**) as one object per key — `{base, bonus, mod, total}`:
  - `base` from the stat **totals**, using `Math.trunc`: `armure=trunc(defense.total/10)`, `barriere=trunc(defenseSpeciale.total/10)`, `initiative=trunc(vitesse.total/10)×2`, `physique=trunc(attaque.total/10)`, `special=trunc(attaqueSpeciale.total/10)`. Pokémon recalculate these after applying Nature.
  - `bonus` starts at 0; the Trainer adds its unlocked tree nodes into it
  - `mod` is `derivedMods[key]`
  - `total = base + bonus + mod`, computed, never stored
  The sheet shows **Base + Modif. = Total** exactly like a stat, where its "Base" cell is `base + bonus` (everything automatic) and carries a tooltip breaking the two apart when a tree bonus applies. Also sets `battle.<res>.total` (= max, subclasses add bonus) and `.bonus`.

**Trainer (`module/data/actor-trainer.mjs`, extends base):**
- Adds 4 stats to `system.stats`: `charisme, discretion, talent, connaissance` (init 50) via overriding `static defineStats()` (both use `LobiaActorBase.statField()`).
- `system.money`: integer ≥ 0 (Pokédollar ₽).
- `system.identity`: `prenom, nom` (str), `niveau` (1–20), `age` (int), `taille, poids` (decimal), `sexe, attirance, metier` (str).
- `system.type`: `{secondary, third, fourth}` — StringFields, `choices = Object.keys(LOBIA.types)`, blank allowed. The **primary type is always Normal** (`LOBIA.trainerBaseType = "normal"`), implicit/not stored.
- `system.skills`: ObjectField map `"<stable-skill-key>" → tier(1|2|3)` (for example `acier-machine`). Keys are stored on the skill Item and do not derive from its editable fields. `migrateData` promotes the former column-based keys through `skill-key-migrations.mjs`.
- `system.trees`: ObjectField map `"<branchType>" → { "<nodeId>": true }` (unlocked cells).
- `system.treeRolls`: ObjectField map `"<branchType>-<nodeId>" → result`, currently used to persist each one-time `PV +` 2d4 roll so it can be displayed and reversed safely.
- Computed getters: `branches` (Normal + chosen, deduped), `skillPointsTotal` (= niveau), `skillPointsSpent`, `skillPointsRemaining`, `competenceSlots`, `skillStepsSpent`, `skillStepsRemaining`, `isNodeUnlocked/isNodePrereqMet/isNodeAvailable`.
- `prepareDerivedData` (calls super) applies unlocked tree bonuses: Physique/Spécial/Initiative + grant +2; Armure/Barrière + grant +1; action-economy + grants +1 to `battle.<res>.total = max + bonus`. Classifier `#applyBonusLabel` string-matches French labels.

**Pokémon (`module/data/actor-pokemon.mjs`, extends base):**
- `system.pokemonTrees` is a separate ObjectField map of family branch ID → unlocked cells, independent of Trainer trees. `module/data/pokemon-kanto-data.mjs` is generated from the workbook's 16 sheets **and comments**: 181 species, 74 families, **309 ten-cell trees**. The extractor scans all adjacent tree-column pairs from K–L onward (through Q–R in Kanto). Évoli has three starting trees, and Lokhlass, Scarabrute, Kangourex, Tauros, Métamorph, Mew, Ptéra and Canarticho each have four.
- **Tree visibility follows explicit ROOT remarks.** Linear families share all trees. Within a branching family, a root explicitly requiring evolution into a *named* form belongs only to that path (Debugant → Kicklee/Tygnon/Kapoera; Évoli's own evolution branches). Neutral roots, level caps and unnamed “after evolution” remarks remain visible across the family, though they may prevent purchase. Thus all four Mystherbe/Ortide/Rafflesia/Joliflor trees remain visible to every form. The commented Aromathérapie cell becomes Papillodanse specifically for Joliflor. Ptitard, Ramoloss and Insécateur mix shared and exclusive trees. Rendering, availability and bonuses all use the same filtered branches; hidden siblings cannot be bought.
- Each branch has seven rows: **paid root** → split → single → split → single → split → final move. All ten cells cost one point each, later cells need an unlocked parent, and Pokémon points equal level (provisional). Legacy invested branches gain a paid root via `migrateData`. Roots are white before purchase and green afterward; branch species headings are hidden. Numeric `+` labels apply automatically (+1 combat/Armure/Barrière, +2 Physique/Spécial/Initiative); PV + rolls the `Niv(…)` dice in the saved species HP formula once per cell, stores it in `pokemonTreeRolls`, adds to current/max HP and reverses the exact result on lock/cascade/reset. Already-unlocked PV + nodes missing a roll show a one-time die button. Move effects remain descriptive. Unprofiled Pokémon show four inactive placeholders. Tests: `node tools/test/pokemontreecheck.mjs`, `node tools/test/pokemonhpcheck.mjs` and `node tools/test/pokedexsourcecheck.mjs`.
- `module/data/pokemon-species.mjs` reads generated Pokédex data through `pokemon-pokedex.mjs`; each species has workbook HP formula/base/dice, battle resources, stats, typing, male/female ratio, average cm/kg, up to three Talent keys, evolution condition and evolution-HP comment. For the four Talent names absent from the global catalogue (`Multiécaille`, `Recharge`, `Danseuse`, `Pieds Confus`), the source name is preserved as a custom reference; Chrysacier/Coconfort have only one listed Talent and other slots stay blank. A 0/0 ratio sets `sex: none` on the compendium template. Excel's actual cell formulas compute stat budgets, not HP; `Niv(XD4)` is literal text. HP growth/evolution rolls remain unimplemented.
- **Compendium templates, not a species-data panel:** `module/packs/pokemon-template-pack.mjs` runs on GM `ready`, finds 181 matching Actor documents in bundled `lobia.pokemons`, updates each once per version (**now v3**) and marks `flags.lobia.speciesTemplateVersion`; `game.lobia.setupPokemonTemplates({force:true})` explicitly re-applies the workbook baseline. It unlocks the pack temporarily and restores its lock. Templates store baseline stats, types, full battle allotments, averages, eligible Talents, base HP, `system.species.{hpFormula,evolution,evolutionHp,malePercent,femalePercent}`, empty tree progression, and **unrolled** identity fields (size/weight/nature/shiny/dominant/sex/active talent). New world copies inherit these fields and cannot be overwritten by automatic template seeding. Principal has no species panel; players see averages read-only while a GM can edit averages on a copy if needed. Templates hide individual roll buttons and disable tree spending. Talent selectors for profiled species list eligible options plus already assigned custom values. Test template idempotence/pack locking with `node tools/test/pokemontemplatecheck.mjs`.
- **Captured-individual rolls:** measurement/Dominant, Nature and Shiny are each one-time rolls (persisted `sizeRoll`, `natureRolled`, `shinyRoll`, plus in-flight guards). Measurements use the same 1d100 for size/weight and Dominant iff 100; the independent shiny d100 grants Chromatique iff 1. Players can roll once, but only the GM can manually edit Nature, size/weight, Dominant and Shiny; document updates reject direct player edits to those fields. The buttons disappear after rolling. GM changes never reset the one-time roll markers.
- Has only the 5 shared battle stats (no trainer social stats).
- `system.type`: `{primary, secondary}`; primary defaults to Normal and is required, secondary is optional. The defensive profile uses both, deduplicated.
- `system.identity`: nickname, level (1–20), sex (`male/female/none`), size/weight, `averageSize` (cm)/`averageWeight` (kg) populated on profiled templates, saved `sizeRoll`/`shinyRoll`, nature, shiny and dominant booleans. The document's `name` is the Pokémon's name.
- `system.talents`: up to three stable key references `first/second/third` into `world.talents-pokemon` (or preserved custom names where the source has no matching catalogue entry), and one `selected` slot (`first`/`second`/`third`). Profiled Pokémon get their workbook choices in the compendium template; Principal shows the nonempty choices as mutually exclusive radio cards and the active Talent's effect. The old hidden-Talent marker is removed by `migrateData`. Players cannot change available slots through document updates; they choose only among those slots. Effects remain narrative text, **not automatically enforced**.
- `module/packs/talents-data.mjs` is generated from `~/Downloads/Talents.xlsx` via persistent `tools/xlsx/extract-talents.mjs`; contains 374 `{key, category, name, effect}` entries, 17 `{key, name, description}` categories, plus the workbook introduction. Categories are pack Folder documents with editable HTML descriptions and stable flags. Talent Items have `system.{key, category, effect}`; renaming, changing category or reordering keeps the actor reference intact, but changing an assigned **key** does not. `module/data/talent-registry.mjs` caches compendium edits, refreshing open Pokémon sheets in world and already-loaded system pack on Talent Item hooks (debounced 200ms). Missing packs use bundled fallback; an empty existing pack is authoritative. Seed version is `TALENTS_VERSION = 1` in `module/packs/talent-pack.mjs`; normal upgrades add missing items but preserve existing GM edits. `game.lobia.setupTalents({force:true})` *overwrites matching Talent fields*; `game.lobia.importTalents({replace,overwrite})` is more granular. See `tools/README.md`.
- `module/data/pokemon-natures.mjs`: bundled seed/fallback for 25 consecutive four-result bands on 1d100. Runtime consumers use `module/data/nature-registry.mjs`, populated from the GM-owned `world.natures-pokemon` compendium by `module/packs/nature-pack.mjs`. Actor preparation reads cached Nature effects synchronously; rolling reads cached ranges/names. Editing a Nature refreshes the registry, Pokémon derived stats and open sheets (world Actors and already-loaded `lobia.pokemons` system-pack actors; debounced 200ms). A missing pack uses bundled fallback; an intentionally empty existing pack is authoritative. Seeded effects are ±10 on two stats or neutral; the GM can edit the five numeric adjustments and 1d100 ranges. Nature is persisted by key so editing or rerendering never rerolls. `rollPokemonNature()` announces the roll in chat; uncovered roll results warn instead of silently selecting a different Nature.
- `nature` Item subtype (`data/item-nature.mjs`) stores `key`, `min`, `max`, and `effects` for the five shared stats; `nature-sheet.mjs`/`templates/item/nature.hbs` expose all of them. `NATURES_VERSION` and separate `lobia.naturesVersion` control seeding; `game.lobia.setupNatures({force:true})`, `.importNatures()` and `.refreshNatureRegistry()` are available for recovery.
- On Statistiques, an affected Pokémon stat displays the effective **Base** (stored base + Nature bonus) as a read-only highlighted badge; hovering the stat shows the original base and Nature adjustment. **Base + Modif. = Total** remains on one line. The Pokémon header and sheet window show the nickname (or species name if blank); the GM edits the species name on Principal, while players may edit the nickname.
- `rollPokemonMeasurements()` uses one 1d100 result for both dimensions: `(result/100 + 0.5) × average`, rounded to two decimals. Refuses to roll while either editable placeholder average is zero; saves resulting dimensions and die result, announces in chat.

**Items (`module/data/item-objet.mjs`):** an item carries **name** (the document's own), **price** (₽) and **description** (full, HTML), plus two bits of carrying state: `quantity` and `slot` (weapon-slot index 0-2, else null). A `short` one-line description existed briefly and was removed — the source spreadsheet has no such column, so it was empty on every item.

Filing is a **two-level taxonomy** in `module/data/item-taxonomy.mjs`: 5 big categories, each with sub-categories. An item stores only `system.subcategory` (a globally unique `"<category>-<sub>"` key, e.g. `arme-shooter`); `system.category` is a **getter** derived from it, so an inconsistent pair is impossible. `static migrateData` folds the earlier flat `category`/`effet` shape into it.

| Category | Sub-categories |
| --- | --- |
| `pokeball` | standard, poids, speciale, illegale |
| `bonus` (Soin et Bonus) | soin, combat, accelerateur, plumes |
| `arme` | knocker, shooter, slasher, blocker, healer, modificateur, **medieval**, **armure** |
| `accessoire` | boost, power, meteo, special |
| `recharge` | standard, statut |

### Documents (`module/documents/`)
- `LobiaActor` (`actor.mjs`): `rollStat(key,{modifier})` (d100 → chat; target = `stat.total` + situational modifier, clamped 0–100, with a `65 +20` breakdown in the card), `resetBattleResources()`, and the tree mutations: `unlockTreeNode`, `lockTreeNode` (cascade-prune orphans), `learnOrLevelSkill`, `lowerSkill`, `resetTree` (DialogV2.confirm). **All tree/skill writes use flattened update paths and `-=` deletions** (see gotchas).
- `LobiaItem` (`item.mjs`): stub.

---

## 4. The Trainer skill-tree mechanic (decoded from the xlsx)

- A Trainer has **4 branches** = Normal (always) + secondary + third + fourth. Each branch is one **type tree**.
- Tree topology is **uniform across all 18 types** (`module/data/tree-template.mjs`), tiers top→bottom:
  `Root(free) → CompétenceDresseur → split[statA | SansRecharge] → CompétenceDresseur → split[Immunité | Connaissances] → CompétenceDresseur → split[statB | Maître] → Terminal("Action +", +1 max action)`
- **Nodes:** `root` (free, auto-unlocked), `competence` (grants a skill step), `bonus` (passive, per-type label), `terminal`. The **root is not drawn** — the tree's title already carries the type name — so sheets render `TREE_DISPLAY_ROWS` (7 rows, 10 nodes) while `TREE_NODES` keeps all 11: the root is still the anchor every tier-1 prerequisite points at.
- **Prerequisite:** a cell unlocks only if the root or **≥1 parent** (OR logic; parents listed per node) is unlocked.
- **Points:** 1 per trainer level (Niveau). Each non-root cell costs 1.
- **Compétence Dresseur cells** grant "skill steps": one step = learn a new skill at tier 1 OR raise an owned skill by one tier (max 3 = MAX). Skills restricted to the trainer's 4 branch types. `competenceSlots − skillStepsSpent = steps available`.
- **Bonus effects auto-applied:** Physique/Spécial/Initiative + → +2 derived; Armure/Barrière + → +1 derived; Action/ActionBonus/Réaction/Déplacement + → +1 battle total. `PV +` rolls 2d4 once on unlock, stores the result in `treeRolls`, and adds it to current/max PV; locking/resetting subtracts that same result. Immunité X, Sans recharge and Connaissances/Maître remain narrative.

### Skill & tree DATA (seed + fallback — do not hand-edit)

These two generated modules are no longer read directly by the sheets. They **seed** the `world.competences-dresseur` and `world.arbres-dresseur` compendia and act as the registry's fallback (see §5).

- `module/data/skills-data.mjs` — 198 skills (18 types × 11). Each: `{key, type, category, name, tiers:{1,2,3}}`. `key` is a stable type-prefixed slug independent from the name, type, category and ordering. Exports `SKILLS`, `SKILLS_BY_TYPE`.
- `module/data/skill-key-migrations.mjs` — compatibility-only map from the former source-coordinate keys to stable slugs. It is consumed by Item/Actor migration and v2 compendium seeding; it is not part of the active skill structure.
- `module/data/trees-data.mjs` — per-type bonus-node labels (`TREE_LABELS`).
- The **original Trainer skill/tree extractor is lost** (see §7). Do not hand-edit generated files. Rebuild a persistent extractor under `tools/` if that source changes, then bump `SKILLS_VERSION` in `packs/skill-pack.mjs` so existing worlds re-seed.

---

## 5. Sheets & UI (`module/sheets/`, `templates/`)

ApplicationV2 + `HandlebarsApplicationMixin`. Register via `foundry.applications.apps.DocumentSheetConfig.registerSheet`.

- **`LobiaActorSheet` (actor-sheet.mjs)** — base + the **Pokémon** sheet. Uses the shared fancy header and four tabs: Principal (`pokemon-main.hbs`), Statistiques (5 stats, Modificateur and PV/action resources), Arbre de compétences (`pokemon-tree.hbs`) and Capacités (`pokemon-moves.hbs`). The header exposes primary/optional secondary type and computes weaknesses/resistances/immunities from both. Builds shared context used by the Trainer subclass too. Actions include Pokémon tree unlock/lock/reset.
- **`LobiaTrainerSheet` (trainer-sheet.mjs)** extends it. Tabbed. Adds tree/typing context and actions `unlockNode/lockNode/learnSkill/lowerSkill/resetTree`.
- **`LobiaItemSheet` (item-sheet.mjs)**.
- **`LobiaNatureSheet` / `LobiaTalentSheet`** (`nature-sheet.mjs`, `talent-sheet.mjs`; `templates/item/nature.hbs`, `talent.hbs`) edit their GM-owned Item documents. All five Item subtypes are declared in `system.json`, registered with DataModels and ApplicationV2 sheets in `lobia.mjs`.

### Pokémon layout and generation
- Shared `trainer-header.hbs`: Trainer name remains editable; Pokémon header shows nickname or species name, read-only. The GM-only Pokémon `name` field lives on Principal. The header also shows current/total PV, action resources, portrait, typing and defensive chips.
- Principal (`pokemon-main.hbs`): nickname, level 1–20, sex (`male`/`female`/`none`), rolled shiny/dominant badges, Nature dropdown + 1d100 roll, size/weight, compendium-provided species averages, shared 1d100 measurement/Dominant roll, separate shiny 1d100 roll, up to three visible species-specific Talent radio choices and the selected effect. Averages are player-read-only, GM-editable.
- Nature table seeded from `pokemon-natures.mjs`: 1–4 Assuré, 5–8 Bizarre, through 97–100 Timide. GM-edited Item name/range/effects take precedence. An affected Statistiques card shows effective **Base = stored base + Nature adjustment** in a read-only highlighted badge with a tooltip; a smaller *Initiale* field edits the stored base. Manual `mod` stays separate, and Nature feeds derived modifiers and rolls. Unaffected stats retain their normal editable Base input.
- Measurement formula (one 1d100 roll for **both**): `(result/100 + 0.5) × average`, rounded to two decimals. Example: average 60 cm/6 kg and result 70 → 72 cm/7.2 kg. Average values currently default to 0 and must be entered manually before rolling; the resulting dimensions and `sizeRoll` persist. `rollPokemonNature()` and `rollPokemonMeasurements()` post their results to chat.

### Trainer layout
- **Header** (`trainer-header.hbs`, always visible, styled fancy): name title · HP pill · 4 battle pills (`value` editable / `total` display, `total = max + tree bonus`) · reset · portrait (right) · **Weaknesses/Resistances/Immunities** rows at the bottom.
- **Tab "Principal"** (`trainer-main.hbs`): fancy identity **card** — label/value rows, centered "NIVEAU" banner, grouped sections, unit suffixes (ans/cm/kg/₽), Type chips.
- **Tab "Statistiques"** (`trainer-stats.hbs`): two shared partials, both drawing the same card, both registered in `lobia.mjs` init via `foundry.applications.handlebars.loadTemplates` and reused by the Pokémon sheet.
  - `lobiaStatBlock` (`templates/actor/parts/stat-block.hbs`): one card per stat — clickable name (rolls d100 against `total`) over `Base` + `Modif.` = `Total` (total is a read-only badge; the modifier cell is tinted green/red by sign). Cards render in `context.statGroups`, **two unnamed groups** (the 5 shared battle stats, then the 4 trainer-only ones) split in `_prepareContext` on `Object.keys(CONFIG.LOBIA.stats)` and divided by a plain hairline (`.lobia-stat-sep`, emitted by `{{#unless @first}}`). Empty groups are filtered out, so a Pokémon shows one group and no separator. A small right-aligned footer prints `context.statBaseTotal` — the sum of every `base` score, modifiers excluded (9 stats at 50 → "Total des bases : 450").
  - `lobiaDerivedBlock` (`templates/actor/parts/derived-block.hbs`): the Modificateur values as read-only cards with the same chrome as the stat cards (icon per key from `LOBIA.derivedIcons`, value in the same dark badge as `Total`).
  - Below Modificateur, the PV card and four action-economy cards expose editable bases as **Base + Bonus = Total**. Tree bonuses and totals are read-only here; the header still shows and edits each current `value` against that total.
- **Tab "Arbre de compétences"** (`trainer-tree.hbs`): **type/branch chip-selectors at top** (Normal fixed chip + 3 chip-`<select>`s, colored by value, blank shows dashed "＋") · points/steps summary + Reset tree · the 4 trees · the skills panel (acquired skills sorted to top per type).

### Typing
`module/data/type-chart.mjs` — standard Gen 6+ effectiveness. `defensiveProfile([type1,type2])` → `{attackerType: multiplier}`. Trainer defensive profile uses the **first two types only** (Normal + secondary); 3rd/4th are branch-only. Multipliers: >1 weakness, 0<x<1 resistance, 0 immunity.

### Per-type colors
CSS vars `.lobia-type-<key> { --lobia-type-color: #… }` (18 types) drive chip backgrounds and tree-title accents.

---

### Inventory tab (`trainer-inventory.hbs`)

Inventory entries are **real embedded Items** (`type: "objet"`) on the trainer, placed by their derived `system.category`. There is no inventory array on the actor; the only actor-side field is `system.inventory.autres`, the free-text panel at the bottom.

- **Weapon slots:** 3 rows (`LOBIA.weaponSlots`), each holding one `arme` + one `accessoire`, matched by `system.slot === <index>`. Occupancy lives on the item, so deleting one frees its slot — no dangling references.
- **Reserve strip:** `arme`/`accessoire` items with `slot === null` render as chips above the buckets, so a carried weapon is never invisible.
- **Buckets:** `LOBIA.inventoryBuckets` = `["pokeball", "bonus", "recharge"]` (armes/accessoires live in the slots instead). Uncapped, and **grouped inside by sub-category** — a group only renders when it holds something. Pastel accents per category via `.lobia-cat-<key> { --lobia-cat-color }`.
- **Drag & drop:** `ActorSheetV2` already binds `DragDrop` in `_onRender` (dragSelector `.draggable`), so rows only need `class="draggable" data-item-id`. `#_onDropItem` reads `[data-drop-category]`/`[data-drop-slot]` off the drop target. **A drop never changes what an item is** — it only sets `slot` — so dropping a Pokeball on the weapon rack is refused with a notification, as is dropping onto an occupied slot.
- **Actions:** `openItem`, `openItemCompendium` (opens `world.objets`; drag from there into the desired bucket/slot), `deleteItem` (DialogV2.confirm), `adjustQuantity` (±1, floor 0). Embedded item edits go through `item.update()`, never the actor form.
- **Hover card:** built in `#itemVM`, rendered via `data-tooltip-html` (v13 sanitises through `cleanHTML`; text is escaped with `foundry.utils.escapeHTML` first). Shows sub-category, price, full description.

### The item catalogue (`module/packs/item-pack.mjs`)

The GM owns the list, in the **`world.objets`** compendium — a *world* pack, so it is unlocked and survives system updates.

`setupItemCompendium({force})` runs on `ready` and is the single entry point. It decides from the **world’s own state**, never from a one-shot "already done" flag:

| Pack | World version | Result |
| --- | --- | --- |
| missing | any | created **and filled** (this is the "I deleted it" case) |
| exists, any size | `< CATALOGUE_VERSION` | catalogue imported (merge) |
| exists, non-empty | current | left alone |
| exists, empty | current | left alone — treated as a deliberate emptying |

`force: true` overrides all of it. Everything is logged to the console with a `Lobia |` prefix, and failures raise `ui.notifications.error` — **an early return must never be silent**, which is exactly the bug that made this look like "nothing happens".

Exposed at runtime: `game.lobia.setupItems({force})`, `.importItems()`, `.ensureItemCompendium()`, `.ITEM_CATALOGUE`, `.CATALOGUE_VERSION`. These are assigned **before** setup runs, so they stay reachable even if setup fails.

**Bump `CATALOGUE_VERSION`** in `item-pack.mjs` whenever `items-data.mjs` is regenerated and every world should pick the new list up.

**Folders.** `ensureFolders(pack, subKeys)` builds a folder per big category (coloured from `ITEM_TAXONOMY[].color`, manual sort in catalogue order) with one sub-folder per sub-category inside — 5 + 20 = **25 folders**. Folders are matched by a **`flags.lobia.key`** flag, not by name, so renaming or recolouring one keeps it instead of producing a duplicate. Only sub-categories that actually hold items get a folder. Items are filed on create; on update a folder is only set when the item has **none**, so an item a GM moved by hand stays put.

`importItems(entries = ITEM_CATALOGUE, {replace})` matches on **name + sub-category**, so re-importing updates in place instead of duplicating. It unlocks the pack if needed and returns `{created, updated, skipped}`.

**Source data:** `~/Downloads/Objects.xlsx` — 5 sheets (Pokeball / Soin et bonus / Armes / Accessoire / Recharge), columns `Nom | Prix | Description`. Extracted by persistent `tools/xlsx/extract-items.mjs` (+ `parse.mjs`, `cells.mjs`) into generated `module/packs/items-data.mjs` (`ITEM_CATALOGUE`, **146 items** — do not hand-edit). After regenerating, **bump `CATALOGUE_VERSION`** so existing worlds re-import; or re-import by hand with `game.lobia.importItems()`. The generator verifies its output by importing the written file and comparing counts — an earlier truncated write silently cost 108 items.

**Path gotcha:** the header of `items-data.mjs` still says `scratchpad/extract-items.mjs`; that historical path is wrong. The persistent generator is `tools/xlsx/extract-items.mjs`.

Parsing rules that matter if you regenerate:
- A row carrying **only an A cell** (no B/C cells at all — not merely empty ones) is a **sub-category heading**. Cell *styles* differ per sheet and are not a reliable signal; cell presence is.
- Prices: `"15 000"` → `15000`; `"---"` (gift / not for sale) → `0`. 110 items end up at 0, mostly the unpriced medieval sections.
- Descriptions become one `<p>` per source line, HTML-escaped.

**Known gaps in the source spreadsheet** (data issues, not code):
- **No short-description column** — the sheets are `Nom | Prix | Description` only, which is why the `short` field was dropped from the model.
- `Arme Medieval` (54) and `Armure Medieval` (54) are **excluded from the import** (`EXCLUDED_SUBS` in `extract-items.mjs`): they have no prices, most rows have no description, and the owner deleted them from the compendium by hand — keeping them would let a re-import resurrect them. Their sub-category keys are **kept in the taxonomy** so the sections can be switched back on by emptying that list once the spreadsheet rows are filled in. 34 of those rows also carried duplicate names (the `Armure` block still says "Arme X" on 27 of 47 rows).

**Note:** dropped items are **copies** carrying their own data, so later GM edits to the compendium do not retro-change a trainer’s inventory.

---

### The skill catalogue (`module/packs/skill-pack.mjs`)

Skills and per-type tree labels are **GM-editable documents** in **two** world compendia:

| Compendium | Holds | Layout |
| --- | --- | --- |
| **Compétences Dresseur** (`world.competences-dresseur`) | 198 `competence` items | one folder per type (18) |
| **Arbres Dresseur** (`world.arbres-dresseur`) | 18 `arbre` items | flat, sorted in type order |

Two Item subtypes back them:
- **`competence`** (`data/item-competence.mjs`): `key`, `type`, `category`, `tiers{1,2,3}`. The document name is the skill name. `key` is the persisted identity an actor stores in `system.skills`; renaming, retyping, recategorizing or reordering a skill is safe, but changing its key after assignment orphans that progression.
- **`arbre`** (`data/item-arbre.mjs`): `type` + the six `labels` (statA, subRecharge, immunite, subConnaissance, statB, subMaitre). Its sheet draws the same 8-row shape as the trainer tree, with the bonus nodes as inputs. **Topology is not editable** — it is uniform across all 18 types by design (`tree-template.mjs`).

**The registry (`module/data/skill-registry.mjs`) is the seam.** Actor `prepareDerivedData` is synchronous and runs constantly, so both packs are read **once** into an in-memory registry; `actor-trainer.mjs` and `trainer-sheet.mjs` call `getSkills(type)` / `getSkill(key)` / `getTreeLabels(type)` and never touch a pack during a render. Skills are indexed by stable key and ordered by the GM-controlled Item `sort`, not by source coordinates. The generated `skills-data.mjs` / `trees-data.mjs` are the **seed and the fallback**: used until the packs load, and if they are missing or empty. A half is adopted from the compendium wholesale as soon as it holds anything of that kind — partial per-type fallback would silently resurrect deleted entries.

`createItem`/`updateItem`/`deleteItem` on **either** pack (see `isSkillDocument`) trigger `refreshSkillRegistry()`, **debounced 200 ms** (a first seed fires the hook 216 times), which re-prepares trainer actors and re-renders open sheets. Editing a label in Arbres Dresseur updates a trainer's tree live.

Runtime helpers: `game.lobia.setupSkills({force})`, `.importSkills()`, `.importTrees()`, `.refreshSkillRegistry()`. Seeding is guarded by the `lobia.skillsVersion` world setting against `SKILLS_VERSION`; matching is by a `flags.lobia.key` flag so a renamed document updates instead of duplicating, and a GM's own foldering is preserved.

`SKILLS_VERSION = 2` migrates existing compendium documents in place: old flags are aliased to the new stable keys, `system.key` is written, and obsolete `system.col` data is deleted. Actor progression migrates synchronously through the same compatibility map.

---

### The Nature & Talent catalogues (`module/packs/nature-pack.mjs`, `talent-pack.mjs`)

- **Natures Pokémon**: `world.natures-pokemon`, 25 `nature` Items. `system.{key,min,max,effects}` plus the Item document name, with effects for all five battle stats. Stable `key` is saved in `pokemon.system.identity.nature`; changing an assigned key orphans that selection. The seeded 1d100 ranges each span four values. `NATURES_VERSION = 1` / `lobia.naturesVersion`; `setupNatures`, `importNatures`, `refreshNatureRegistry`, `ensureNatureCompendium` are exposed on `game.lobia`. On re-import/version bump **matched documents are updated**, which can overwrite GM edits; avoid force/re-import unless intentional.
- **Talents Pokémon**: `world.talents-pokemon`, 374 `talent` Items filed under 17 Item folders, each with an editable HTML description from the Introduction worksheet. Documents store `system.{key,category,effect}` and the Item name. Stable keys (`anti-bruit`, etc.) are saved in the three Pokémon Talent slots. GM edits to a name/effect propagate to the sheet's selected Talent description; Talent effects are **narrative**, not mechanically automated. `TALENTS_VERSION = 1` / `lobia.talentsVersion`; `setupTalents`, `importTalents`, `refreshTalentRegistry`, `ensureTalentCompendium` are exposed on `game.lobia`. Normal upgrades add missing records **without overwriting** existing GM edits; `setupTalents({force:true})` overwrites matched fields, and `importTalents({replace:true})` deletes/recreates pack entries.
- Both world packs give players OBSERVER on creation and load their documents into synchronous registries (`module/data/nature-registry.mjs`, `talent-registry.mjs`) on `ready`; sheets/data models never query a pack on every render. A missing pack falls back to bundled data; a deliberately emptied existing pack stays empty. `createItem` / `updateItem` / `deleteItem` hooks on the exact pack and Item subtype debounce refreshes by 200 ms. Nature edits re-prepare Pokémon and rerender open sheets; Talent edits rerender open sheets for world actors and already-loaded `lobia.pokemons` actors. Compendium folders match `flags.lobia.key`, so renames and edited descriptions survive a normal import.
- `~/Downloads/Talents.xlsx`: sheet 1 Introduction (general intro and 17 category descriptions), then 17 category sheets of `Name | Effect`; 374 populated Talent rows, no duplicate names/empty effects at extraction time. Generated `module/packs/talents-data.mjs` exports `TALENT_INTRODUCTION`, `TALENT_CATEGORIES`, `TALENT_CATALOGUE`; regenerate only via `tools/xlsx/extract-talents.mjs`. Source quirk: the Introduction's **Priorité** description appears to describe Forme; it is imported faithfully, so GM can edit that folder description if desired. The extractor currently validates the expected 17/374 counts; update its expectation deliberately if the workbook changes.

---

### The authored Guide du Dresseur (`module/packs/rulebook.mjs`)

**Guide du Dresseur** (`world.guide-dresseur`) is a player-readable compendium of JournalEntries containing rules useful during Foundry play. Players get OBSERVER on pack creation. Trainer Compétences and type-tree Items remain in their own compendia, not the guide.

- Previous versions generated 18 type chapters (36 pages). On GM `ready`, `cleanupGeneratedGuide()` removes only entries carrying `flags.lobia.generated: true` and a recognized `type-<type>` key. If a chapter has GM-written pages, only the old generated `arbre-*`/`skills-*` pages are removed and the chapter is retained as an authored JournalEntry with its flag cleared. Other entries, including Météo, are never touched. The cleanup is idempotent and restores an initially locked pack.
- Skill registry refreshes continue to update Trainer sheets, **not** the Guide; `buildRulebook` and its runtime API were removed. Runtime recovery: `game.lobia.cleanupGeneratedGuide()` and `game.lobia.ensureRulebookPack()`.
- Core `text` pages only; no custom page subtype or `system.json` entry. Content is HTML in `text.content`. Existing `.lobia-guide-*` CSS is retained for any GM-authored pages using it.

`module/data/weather-data.mjs` contains the 17 supplied French weather rules (including two Glace weathers; none were supplied for Normal or Combat). `module/packs/weather-journal.mjs` adds one **Météo** JournalEntry with one page per weather on GM `ready`; each page shows its associated type. Existing entries/pages and GM edits are preserved on subsequent loads. `game.lobia.setupWeatherJournal({force:true})` deliberately restores only seeded weather pages while preserving GM-added pages. Rules are reference text, not automated combat/weather effects. Run `node tools/test/rulebooktest.mjs` for cleanup, source text, lock restoration and GM-content preservation.

---

## 6. Foundry v13 gotchas (these caused real, silent bugs — heed them)

1. **ObjectField updates MERGE, they don't replace.** `actor.update({"system.trees": smallerObj})` adds keys but never removes absent ones. To delete, use the `-=` syntax on a flattened path: `update({"system.trees.acier.-=cd1": null})`. Adds can use flattened paths too. Never pass `{recursive:false}` on the whole update (it nukes sibling `system` fields).
2. **Never put `.` in an ObjectField map key.** Foundry `expandObject`s update data, so dotted skill keys become nested objects and read back incorrectly. Stable keys use hyphens (for example `acier-machine`).
3. **Each ApplicationV2 template PART must render exactly ONE root element.** Wrap multi-element parts in a single `<div>`/`<section>`. This errors loudly: "Template part … must render a single HTML element."
4. **Action handlers:** declared in `static DEFAULT_OPTIONS.actions` (deep-merged across the class hierarchy, so subclasses inherit base actions). Handlers are `static #fn(event, target)` called with `this` = the app instance; `target` is the closest `[data-action]` element. Left-click only by default.
5. **Tabs:** `static TABS = { <group>: { tabs:[{id,icon}], initial, labelPrefix } }`; PARTS include `tabs: {template:"templates/generic/tab-navigation.hbs"}`; each tab content part wraps in `<section class="tab{{#if tab.active}} active{{/if}}" data-group="{{tab.group}}" data-tab="{{tab.id}}">`; `_preparePartContext` sets `context.tab = context.tabs[partId]`. Tab labels resolve to `<labelPrefix>.<id>`. Add `.tab{display:none}.tab.active{display:block}` in CSS.
6. **Image edit:** `<img data-edit="img" data-action="editImage">` — needs the explicit `data-action`, handled by DocumentSheetV2.
7. **No `eq`/`gt` Handlebars helpers** — precompute booleans in context. `{{selectOptions choices selected=val localize=true blank="…"}}` exists and is used.
8. `Math.clamp` (not `clamped`) in v13.
9. **Numeric path segments in Handlebars need brackets**: `{{system.tiers.[1]}}`, not `{{system.tiers.1}}` — the latter is a **parse error** that kills the sheet. The `name="system.tiers.1"` attribute is fine, it is just a string.
10. **Never leave a duplicated CSS block.** When replacing a style block, delete the old one: a stale copy later in the file silently wins the cascade. A leftover `minmax(130px, 1fr)` re-crushed the stat cards long after the rule that "replaced" it was written.
11. **An early return must never be silent.** A guard that returns without logging is indistinguishable from a broken system. Log the decision, and surface real failures with `ui.notifications.error`.

---

## 7. Source-data pipeline (`tools/`)

**The scripts are in the repo now — see `tools/README.md`.** The first generation of them was written in a session scratchpad and was gone by the next session, leaving generated data nobody could regenerate. Do not repeat that.

- `tools/xlsx/` — `parse.mjs`, `cells.mjs`, `peek.mjs`, `extract-items.mjs`, `extract-talents.mjs`, `extract-pokedex.mjs`.
- `tools/import-pokemon-pack.mjs` — legacy world Pokémon Actor pack → bundled `lobia.pokemons` system pack. Uses Foundry's `classic-level` dependency. Do not rerun `--force` over a modified system pack casually.
- `tools/test/` — the Foundry-stubbing harnesses (see §10).

An .xlsx is a ZIP; there is no `unzip`/`python3` here, so unpack with `jar xf`.

**Objects.xlsx** (items) → `module/packs/items-data.mjs`:
```sh
mkdir -p /tmp/objects && cd /tmp/objects && jar xf ~/Downloads/Objects.xlsx
cd <system> && XLSX_DIR=/tmp/objects node tools/xlsx/extract-items.mjs module/packs
```

**Trainer skills + trees** → `module/data/skills-data.mjs`, `trees-data.mjs`: the original extractor no longer exists. The generated skill catalogue has since been normalized to game-domain fields only (`key`, `type`, `category`, `name`, `tiers`) and deliberately retains no source coordinates. Any replacement generator must emit unique stable slug keys and validate all 198 records before writing. `Arbres Dominants` remains reserved for future Pokémon progression work.

**Talents.xlsx** → `module/packs/talents-data.mjs`:
```sh
node tools/xlsx/extract-talents.mjs
```
The extractor reads `~/Downloads/Talents.xlsx` by default, unpacks it into a temporary directory with `jar`, verifies 17 categories/374 complete unique-key Talents and re-imports the written module to confirm counts. It stores raw category descriptions, Talent names/effects and the introductory text without paraphrasing. Then bump `TALENTS_VERSION` in `module/packs/talent-pack.mjs` to add new entries to existing worlds (normal seeding preserves already-edited documents). **Do not change an assigned Talent's stable key.** See `tools/README.md`.

**Pokedex Kanto.xlsx** → `module/data/pokemon-kanto-data.mjs`:
```sh
node tools/xlsx/extract-pokedex.mjs "$HOME/Downloads/Pokedex Kanto.xlsx" module/data/pokemon-kanto-data.mjs
```
Unpacks with `jar` in a temporary directory, reads all 16 type sheets **and their XML cell comments**, validates 181 species and **309 ten-node branches** grouped into 74 families, then re-imports the generated module. Branch roots are in K/M/O/Q in this file, with split cells in the next column; the extractor scans tree pairs dynamically rather than assuming a two-tree maximum. `node tools/test/pokedexsourcecheck.mjs` independently compares **all 3,090 node labels and 324 tree comments** against the original workbook, so missing columns fail a test. A gap >8 rows starts a new family. Three remarks specify alternate cell names after branching evolution (Roigada/Joliflor), preserved dynamically. For later Pokédex workbooks, pass a new input/output path, register the new module in `module/data/pokemon-pokedex.mjs`, check duplicate species and bump `POKEMON_TEMPLATE_VERSION`. Four source Talents lack catalogue matches and remain named custom choices. All 181 names matched actors in a copy of the original 1,127-Actor pack. Do **not** hand-edit the generated module or live LevelDB while Foundry runs.

**Legacy Pokémon actor pack**: source `Data/worlds/lobia/packs/pokemons` (SWB) → `Data/systems/lobia/packs/pokemons` (system pack declared in `system.json`). The already-built output has 1,127 Actors + 203 type → generation folders; primary type comes from its root folder, secondary remains empty, five SWB battle stats map to Lobia bases and SWB health to HP; token HP bar becomes `hp`. Existing source IDs/images/folder relationships are retained. To rebuild deliberately when Foundry is stopped, run `node tools/import-pokemon-pack.mjs --force` from the system dir; `--force` **replaces** the system pack and loses edits made to its documents. The source world pack is not modified. There is no automated migration for the other SWB world content yet.

After regenerating bundled source data, bump its corresponding import version (`CATALOGUE_VERSION`, `SKILLS_VERSION`, `NATURES_VERSION`, `TALENTS_VERSION` or `POKEMON_TEMPLATE_VERSION`) according to that pack's overwrite rules; `lobia.pokemons` is a physical system pack, updated by the GM on `ready` via Foundry APIs rather than rebuilt from scratch.

---

## 8. Known edge cases / TODO

- **Changing a skill's stable `key` after a Trainer has learned it orphans that progression.** Name, type, category and compendium sort can change safely because identity no longer derives from them.
- **Changing assigned Nature/Talent keys** similarly orphans Pokémon references. Nature ranges are GM-editable: uncovered d100 results warn, and overlapping ranges cause a console warning; review the full 1–100 coverage after edits. Talent effects are prose only; automatic combat modifiers would need structured effect data.
- **Most species profiles still need sources:** 181 Kanto-bookwork species out of the 1,127 converted Actors are populated as **compendium templates** on the next GM reload, and their families' trees become available on world copies. Nine more Pokédex workbooks are expected. Do not write directly to the pack's LevelDB files while Foundry is running. Species outside the generated registry keep four inactive tree placeholders. The global Talent catalogue does **not** say which Talent trio other species may have.
- **Pokémon move effects remain descriptive:** the 1,093-move catalogue provides hover cards but no combat automation. PV + is implemented independently from each species' stored HP formula; Trainer `competence`/`arbre` structures remain separate.

- **Type change after investment:** if a trainer unlocks cells in a branch then removes that type, the points stay spent but the tree hides (no auto-refund). A tree reset clears it. Consider pruning `system.trees`/`system.skills` for removed branches on type change.
- The medieval weapon/armour sections are unpriced and excluded from the import. Weapon stats (damage, range) are not modelled: descriptions carry them as text.
- **Migration** from Simple World-Building: SWB stores custom fields loosely under `system.attributes.<key>.value`. Will need a `migrateData`/import mapping once a real actor's SWB schema is inspected. Test on a **backup copy** first.

## 9. World backup/restore (v13)

Foundry's Backup Manager scans `Backups/<collection>/<packageId>/` (e.g. `Backups/worlds/lobia/`), NOT the `Backups/` root. A `.bak` is a ZIP; the `.json` is its metadata sidecar. Restore via Setup → Configuration → Manage Backups.

---

## 10. Validation workflow

Foundry cannot be automated here, so validate statically, then have the owner reload.

**Static:**
- JS syntax: `node --check module/lobia.mjs`; check changed `.mjs` files as well.
- JSON: parse `lang/*.json` and `system.json`.
- **i18n coverage**: every `localize "KEY"` in `templates/` and `module/` must exist in `lang/fr.json`, and fr/en must have the same key set. Both have drifted before.
- Data modules import cleanly in node; sheets and documents **cannot** (they touch `foundry.*` at load) — `node --check` only.

**Beyond static — `tools/test/` (see `tools/README.md`):** stub the `foundry` global and replay the real hooks. This caught, among others: a whole-system load error, a compendium that silently refused to rebuild, an `{{system.tiers.1}}` template that throws (numeric path segments need `.[1]`), and derived-value arithmetic.

Run the focused checks for current work, e.g. `node tools/test/talenttest.mjs`, `node tools/test/naturetest.mjs`, `node tools/test/pokemonmaincheck.mjs`, `node tools/test/pokemoncheck.mjs`, `node tools/test/skilltest.mjs`, `node tools/test/rulebooktest.mjs`, `node tools/test/derivedcheck.mjs`, `node tools/test/hpbonuscheck.mjs`, `node tools/test/derivedtpl.mjs`, `node tools/test/tplcheck.mjs`, `node tools/test/treecheck.mjs`, plus `node tools/test/loadtest.mjs` for module/init/ready load. `loadtest.mjs` intentionally does not stub `createCompendium`; its ready-hook compendium-creation warnings are expected if init and ready complete. `skilltest.mjs` and `talenttest.mjs` stub actual compendium creation/seeding and are better pack regressions.

**Rendering:** compile templates with Foundry's own Handlebars via
`createRequire("~/Downloads/FoundryVTT-Node-13.351/")` and assert on the output — single root element per part, expected cell/row counts, no editable computed fields.

**Then:** tell the owner to reload the world and check F12. Every `setup*` path logs its decision with a `Lobia |` prefix, so "nothing happened" is always diagnosable from the console.
