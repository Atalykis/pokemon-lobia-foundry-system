/** Independently audit every extracted move and its source subcategory. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { POKEMON_MOVES, POKEMON_MOVE_CATEGORIES } from "../../module/data/pokemon-moves-data.mjs";
import { pokemonMove, pokemonMoveCategory } from "../../module/data/pokemon-moves.mjs";
import { POKEMON_MOVE_ALIASES } from "../../module/data/pokemon-moves.mjs";
import { POKEDEX_FAMILIES } from "../../module/data/pokemon-pokedex.mjs";

const source = path.join(os.homedir(), "Downloads", "Capacités.xlsx");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "lobia-moves-audit-"));
try {
  execFileSync("jar", ["xf", source], { cwd: temp });
  process.env.XLSX_DIR = temp;
  const { sharedStrings, sheetCells, refToXY } = await import("../xlsx/parse.mjs");
  const strings = sharedStrings();
  const slug = text => text.toLocaleLowerCase("fr").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const sheets = ["acier", "combat", "dragon", "electrik", "eau", "fee", "feu", "glace",
    "insecte", "normal", "plante", "poison", "psy", "roche", "sol", "spectre", "tenebres", "vol"];
  let index = 0;
  const seenCategories = new Set();
  for (const [sheetIndex, type] of sheets.entries()) {
    const rows = new Map();
    for (const [ref, value] of sheetCells(`sheet${sheetIndex + 1}.xml`, strings)) {
      const { row, col } = refToXY(ref);
      if (col > 6) continue;
      (rows.get(row) ?? rows.set(row, {}).get(row))[col] = String(value).trim();
    }
    let category = "";
    for (const [row, cells] of [...rows].sort(([a], [b]) => a - b)) {
      if (row === 1 || !cells[1]) continue;
      if (!cells[2]) {
        category = slug(cells[1]);
        seenCategories.add(category);
        assert.equal(pokemonMoveCategory(category), cells[1], `${type} row ${row} heading`);
        continue;
      }
      const move = POKEMON_MOVES[index++];
      assert.equal(move.key, `${type}-${slug(cells[1])}`, `${type} row ${row} key`);
      assert.equal(move.category, category, `${type} row ${row} category`);
      assert.deepEqual([move.name, move.class, move.damage, move.difficulty, move.contact, move.description],
        [1, 2, 3, 4, 5, 6].map(col => cells[col]), `${type} row ${row} fields`);
      assert.equal(pokemonMove(cells[1]), move, `${type} row ${row} lookup`);
    }
  }
  assert.equal(index, 1093);
  assert.equal(seenCategories.size, 25);
  assert.equal(POKEMON_MOVE_CATEGORIES.length, 25);
  const sourceNames = new Set(POKEMON_MOVES.map(move => move.name));
  const treeNames = new Set(Object.values(POKEDEX_FAMILIES).flatMap(family => family.branches.flatMap(branch => [
    ...Object.values(branch.labels), ...Object.values(branch.alternateLabels ?? {}).map(value => value.label)
  ])));
  for (const [oldName, canonical] of Object.entries(POKEMON_MOVE_ALIASES)) {
    assert.ok(treeNames.has(oldName), `Unused Pokédex correction: ${oldName}`);
    assert.ok(sourceNames.has(canonical), `Not a workbook move: ${canonical}`);
    assert.equal(pokemonMove(oldName)?.name, canonical, `Incorrect correction: ${oldName}`);
  }
  assert.equal(pokemonMove("Cru aile")?.name, "Cru-ailes");
  assert.equal(pokemonMove("Armure")?.name, "Armure");
  assert.equal(pokemonMove("Armure +"), null, "Armure + is a tree bonus, not the Armure move");
  const unresolved = [...treeNames].filter(name => name && !pokemonMove(name)).sort();
  assert.deepEqual(unresolved, [
    "Action +", "Action bonus", "Action bonus +", "Actionbonus +", "Acton bonus +", "Armure +",
    "Barrière +", "Barruère +", "Déglutition", "Déplacement +", "Fléau", "Forge G",
    "Initiative +", "Physique", "Physique +",
    "Pot de vin", "Pot-de-vin", "PV +", "PV+", "Réaction +", "Réaction+", "Spécial +", "Spéciale +"
  ].sort(), "Unexpected Pokédex names without a workbook match");
  console.log(`Capacités source audit: ${index} moves across ${sheets.length} types, ${seenCategories.size} subcategories`);
  console.log(`Pokédex name audit: ${Object.keys(POKEMON_MOVE_ALIASES).length} corrected; ${unresolved.length} without workbook matches`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
