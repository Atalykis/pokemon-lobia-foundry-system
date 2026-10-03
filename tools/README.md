# Lobia tools

Dev-time scripts. **Not loaded by Foundry** — nothing here ships to the client; they are
plain node scripts run by hand from the system directory.

They live in the repo on purpose: the first generation of these scripts was written in a
session scratchpad and was gone by the next session, leaving generated data files nobody
could regenerate.

## `xlsx/` — spreadsheet extraction

No `unzip`/`python3` on this machine. An .xlsx is a ZIP, so unpack it with `jar`:

```sh
mkdir -p /tmp/objects && cd /tmp/objects && jar xf ~/Downloads/Objects.xlsx
```

| Script | Purpose |
| --- | --- |
| `parse.mjs` | sharedStrings + cell reader. `XLSX_DIR=<dir> node tools/xlsx/parse.mjs <dir> sheet1.xml` dumps a sheet. |
| `cells.mjs` | Adds cell **styles** and row shape (`hasBC`) on top of `parse.mjs`. |
| `peek.mjs` | `XLSX_DIR=<dir> node tools/xlsx/peek.mjs <dir> sheet3.xml 33 62` prints a row range. |
| `extract-items.mjs` | Objects.xlsx → `module/packs/items-data.mjs`. |
| `extract-talents.mjs` | `~/Downloads/Talents.xlsx` → `module/packs/talents-data.mjs` (17 described categories, 374 talents). Unpacks via `jar` and validates its output. |
| `extract-pokedex.mjs` | Pokédex workbook → generated species/family tree data (original XML **and comments**); `--complete-only` skips incomplete blocks and copies anchored portraits for Lobia. |
| `audit-lobia-pokedex.mjs` | Count complete and incomplete Lobia workbook entries from unpacked XML. |
| `extract-capacites.mjs` | `~/Downloads/Capacités.xlsx` → `module/data/pokemon-moves-data.mjs` (18 types, 25 subcategories, 1,093 moves). |

```sh
XLSX_DIR=/tmp/objects node tools/xlsx/extract-items.mjs module/packs
```

It verifies its own output by importing the file it just wrote and comparing counts — an
earlier silent truncation cost 108 items.

For Pokémon Talents, run `node tools/xlsx/extract-talents.mjs` from the system directory.
The category descriptions from the Introduction worksheet become folder descriptions.
After regenerating, bump `TALENTS_VERSION` in `module/packs/talent-pack.mjs` to seed
new entries into existing worlds. Existing GM-edited documents are preserved; explicit
`game.lobia.setupTalents({force: true})` overwrites matched entries.

Pokédex data (Kanto, then the nine forthcoming workbooks):
```sh
node tools/xlsx/extract-pokedex.mjs "$HOME/Downloads/Pokedex Kanto.xlsx" module/data/pokemon-kanto-data.mjs
```
The extractor validates ten node labels per branch, parses cell comments as level/evolution
gates and preserves full note text for tooltips. Outputs are generated — do not hand-edit.
It scans every two-column tree pair (K–L, M–N, O–P, Q–R in Kanto); run
`node tools/test/pokedexsourcecheck.mjs` to compare all 3,090 node labels and 324
comments to the workbook before delivering a new extraction.
Add later generated modules to `module/data/pokemon-pokedex.mjs` and bump
`POKEMON_TEMPLATE_VERSION` in `module/packs/pokemon-template-pack.mjs` so the GM's next
reload applies those profiles to matching system-compendium Actors. Existing world copies
are never reseeded. Four Kanto Talent names are absent from `Talents.xlsx` and remain
named custom references.

Pokémon moves (the filename uses an accented `é`):
```sh
node tools/xlsx/extract-capacites.mjs
node tools/test/capacitescheck.mjs
```

Each worksheet is a type; rows with only a name in A–F are subcategory headings,
including empty ones. All six move columns retain their source text; G–H hold unrelated
worksheet calculations. Matching tree moves show catalogue details on hover and unlocked
moves appear as compact hover-style cards in a single grid in the Pokémon-only
Capacités tab. `module/data/pokemon-moves.mjs`
contains reviewed aliases from Pokédex typos to exact workbook names; the tree displays
the workbook name without changing generated Pokédex data. `capacitescheck.mjs` audits
every alias and flags any newly unmatched tree label. Some remaining labels are bonuses;
Déglutition, Fléau and Pot-de-vin have no entry in the move workbook.

Divighost uses one vertical workbook block with ten member-role trees and eleven portraits:
```sh
node tools/xlsx/extract-pokedex.mjs "$HOME/Downloads/Divighost.xlsx" module/data/pokemon-divighost-data.mjs --complete-only
node tools/test/divighostsourcecheck.mjs
```
Its five selected members may repeat roles; the Actor stores each member's tree progression
separately. The bundled template is seeded into Spectre → LG despite its primary Combat type.

Lobia Pokédex (`~/Downloads/Pokedex Lobia.xlsx`):
```sh
node tools/xlsx/extract-pokedex.mjs "$HOME/Downloads/Pokedex Lobia.xlsx" module/data/pokemon-lobia-data.mjs --complete-only
node tools/test/pokedexsourcecheck.mjs "$HOME/Downloads/Pokedex Lobia.xlsx" module/data/pokemon-lobia-data.mjs
node tools/test/pokemontemplatecheck.mjs
```
Of 247 workbook blocks, only 230 have all five stats and a complete skill tree
(113 families, 459 branches); 17 are excluded for missing stats or tree. The
extractor copies 179 matching workbook portraits into `assets/pokemon-lg/`.
On GM load, the seeder creates missing Pokémon in the bundled `lobia.pokemons`
pack's existing **type → LG** folders, files existing matches by primary type, and applies the
profiles without re-seeding already-current non-Lobia templates. The source test
verifies every included tree label, comment and copied portrait.
An earlier import mistakenly created a top-level LG folder. The seeder moves its
Pokémon into the correct type → LG folders and deletes the accidental folder only
after confirming it is empty.
If a GM load is interrupted after Actor creation, rejoining resumes the import
without creating duplicates. Profiles are applied before folder/artwork changes,
in groups of ten; a failed group retries each Actor separately and reports its
name in the browser console and a GM notification. `pokemonprofilemodelcheck.mjs`
validates every LG profile using Foundry v13's real data schema;
`pokemontemplaterecoverycheck.mjs` checks interrupted/invalid batches. Server
`Logs/debug.*.log` tracks created Actors but client-side update errors appear in
the browser F12 console.

## Quick-roll hotbar Macro

The **Guide du Dresseur** world JournalEntry compendium holds an authored
**Météo** entry. On the next GM load, `module/packs/weather-journal.mjs` adds its
17 text pages from `module/data/weather-data.mjs`, one page per supplied weather,
with a colour-coded type chip. Glace has two; no Normal or Combat weather was
provided. Existing entries and GM edits are retained on reload; an explicit
`game.lobia.setupWeatherJournal({force: true})` restores the seeded pages but
leaves GM-added pages alone. Weather has no automatic combat effects.
Earlier versions placed 18 generated Trainer type/skill-tree chapters in this
compendium. `module/packs/rulebook.mjs` now removes them on GM load and never
rebuilds them. GM-written pages within one of those chapters are kept, as are
unrelated Journals and Météo. `node tools/test/rulebooktest.mjs` tests cleanup,
preservation, idempotence and the weather journal.

Both actor sheets share a **Statuts** panel in the header. Players who own an Actor
can add any of the 16 tabletop statuses at RP level 1–4, change its level with +/-
or remove it. The effects are Actor ActiveEffects with `lobia-*` status IDs and
`flags.lobia.{status,level}`; Foundry displays the configured status icon on the
Actor's linked or synthetic token. Hover the sheet chip for the localized rule,
with `X` substituted by the chosen level in `XD4/6/8`. Effects are recorded but
not automatically applied to dice, HP, action economy or combat turns yet.
`node tools/test/statuscheck.mjs` checks all rule texts/icons, level changes,
creation/removal, and both actor-sheet contexts and headers.

On the next GM load, Lobia creates a shared **Lobia — Jets rapides** world Macro
once. Players and GMs can drag it from the Macros directory to their own hotbar;
it uses their selected token, or their assigned character when no token is selected.
It rolls Lobia d100 stat checks using the actor's real roll-under/critical rules,
then optionally rolls damage with one of the actor's current derived modifiers.
The dialog is also callable via `game.lobia.quickRoll()`. `node tools/test/quickrollcheck.mjs`
checks the roll flow, while `loadtest.mjs` checks shared Macro creation is idempotent.

The GM load also creates the shared **Lobia — Métronome** world Macro. It keeps the
original two-die flow (1d18 for type, then 1dN within that type), but builds all
18 move pools from `module/data/pokemon-moves-data.mjs` instead of a pasted list.
Both dice and the selected move's workbook details appear in chat. A Pokémon that
unlocks Métronome also gets a roll button on its Capacités card. Run
`node tools/test/metronomecheck.mjs` to check the pools and result boundaries.

Pokémon **PV +** tree nodes roll the dice inside the actor's saved species HP formula
(e.g. `10 + Niv(2D4)` → `2d4`). A one-time result is stored per node in
`system.pokemonTreeRolls`, added to current/max HP, shown on the cell and in chat,
and refunded exactly when that cell is locked, cascade-removed, or the tree is reset.
For an already-unlocked PV + cell without a stored roll, the tree shows a die button
to award it once without changing the tree point cost. `node tools/test/pokemonhpcheck.mjs`
checks formula selection, concurrent clicks, persistence, cascade refunds and reset.

The shared **Lobia — Table des types** Macro opens a scrollable, colour-coded
18×18 attack-row / defense-column reference dialog. It reads
`module/data/type-chart.mjs`, the same rules as the Pokémon defensive header;
`game.lobia.showTypeChart()` opens it directly. Run
`node tools/test/typechartcheck.mjs` to verify every cell and the dialog layout.

## Pokémon actor pack conversion

`import-pokemon-pack.mjs` converts the legacy Simple World-Building `world.pokemons`
Actor pack into the system pack declared as `lobia.pokemons`:

```sh
SOURCE_PACK="$HOME/.local/share/foundryvtt/Data/worlds/lobia/packs/pokemons" \
  node tools/import-pokemon-pack.mjs
```

It preserves actor/folder IDs and the type → generation folder hierarchy, maps the five
SWB stats and HP into the Lobia Pokémon schema, derives the primary type from the root
folder, and leaves the optional secondary type blank. The default destination is
`packs/pokemons`; use `--force` only when deliberately replacing that generated pack.

**Two parsing rules that are easy to get wrong:**
1. A cell regex must not let a self-closing `<c r="D1" s="2"/>` swallow the cells after it.
2. A sub-category heading is a row with **only an A cell present** — not merely empty B/C
   cells. Cell *styles* differ per sheet and are not a reliable signal.

## Live-world migration trial (in progress)

The live `Data/worlds/lobia` world still declares `worldbuilding`. A fresh backup is at
`Backups/worlds/lobia/lobia-pre-migration-2026-09-27.tar.gz` (ordinary tar.gz, not a
Foundry `.bak`), and a converted trial is installed as
`Data/worlds/lobia-migration-trial` with world ID `lobia-migration-trial`. The existing
`/tmp/opencode/lobia-world-snapshot` is an older snapshot, not a replacement for the
fresh backup. **Never open live LevelDB collections while Foundry is running.**

```sh
node tools/audit-legacy-world.mjs /tmp/opencode/lobia-world-original-2026-09-27/lobia
node tools/preview-world-migration.mjs /tmp/opencode/lobia-world-original-2026-09-27/lobia
node tools/test/legacyconversioncheck.mjs
node tools/test/worldmigrationcheck.mjs /tmp/opencode/lobia-world-original-2026-09-27/lobia "$HOME/.local/share/foundryvtt/Data/worlds/lobia-migration-trial"
```

The read-only preview uses `legacy-actor-conversion.mjs`, which proposes Lobia actors
without changing the source database. `migrate-world-copy.mjs` only accepts a disposable
copy under `/tmp/opencode` and requires `--apply`. It preserves IDs, ownership, images,
token configuration and original SWB data under `flags.lobia.legacyWorldbuilding`, and
maps HP, battle stats and differences in derived modifiers. It converts the world
Pokémon pack and token HP overrides, and sets the copied world's system to Lobia.

Trial findings: 1,392 world Actors (1,127 species templates in the Pokémon folder)
became 1,211 Pokémon and 181 Trainers; **149 with no recognizable stats** were given
placeholder types from portraits and should be reviewed in the UI. There are 1,062
unlinked scene tokens, of which 106 already referred to missing Actors in the source
world and remain unresolved. All token HP bars and 25 nonempty deltas referencing
existing Actors were converted. 12 world macros and one macro in `Macro Utile` mention
SWB fields and need review. The original media tree `Data/JDR/PokemonLobia` is absent,
so portrait/background paths remain broken until assets are restored. Trial copy passed
`worldmigrationcheck.mjs` for IDs, counts, preserved old data and HP mapping; interactive
Foundry verification remains necessary before switching the live world.

## `test/` — running the system without Foundry

Foundry cannot be automated here, so these stub the `foundry` global and replay the real
hooks. They catch the failure modes that look like "nothing happened" in the browser.

| Script | Checks |
| --- | --- |
| `loadtest.mjs` | Every module imports, `init` registers models and sheets. Catches load-time errors that kill the whole system. |
| `readytest.mjs` | Item compendium: creation, seeding, folders, idempotent re-import, GM-moved items kept. |
| `skilltest.mjs` | Skill + tree compendia, registry loading, live refresh on GM edits, no duplicates on reload. |
| `naturetest.mjs` | Nature Item compendium: 25 seeded entries, editable roll ranges/effects, live Pokémon refresh and idempotent reload. |
| `talenttest.mjs` | Talent Item compendium: 374 entries, 17 described category folders, live edits, legacy free-text migration and idempotent reload. |
| `rulebooktest.mjs` | Retires 18 generated Trainer chapters; keeps GM pages, unrelated Journals and Météo (17 pages); idempotence and pack locking. |
| `tplcheck.mjs` / `treecheck.mjs` / `derivedtpl.mjs` | Compile templates with Foundry's own Handlebars and assert the rendered structure. |
| `derivedcheck.mjs` | `prepareDerivedData` arithmetic: stats → base, tree → bonus, field → mod. |
| `pokemontreecheck.mjs` | Kanto family topology, paid roots, root-comment-based exclusive trees (Debugant) vs shared forked trees (Mystherbe), alternate move label, points/bonuses and cascade refund. |
| `pokemonmaincheck.mjs` | Nature, one-die measurements/Dominant, independent shiny d100, and Principal rendering. |
| `pokedexsourcecheck.mjs` | Independent comparison of all 181 species, 309 branches, 3,090 node labels and 324 tree comments with the original Kanto workbook. |
| `pokemontemplatecheck.mjs` | Bundled Pokémon pack: populate 181 Kanto workbook species, preserve copied actors, idempotence and re-locking. |

```sh
for t in loadtest readytest skilltest naturetest talenttest rulebooktest derivedcheck; do
  printf '%-14s ' "$t"; node tools/test/$t.mjs >/dev/null 2>&1 && echo PASS || echo FAIL
done
```

The Handlebars ones resolve the real library out of the Foundry install:
`createRequire("~/Downloads/FoundryVTT-Node-13.351/")`. `loadtest.mjs` stubs only what
`init` needs, so its `createCompendium is not a function` at `ready` is expected.
