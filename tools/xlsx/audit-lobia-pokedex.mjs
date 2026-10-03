/** Audit workbook blocks before extracting, including intentionally incomplete entries. */
import { POKEDEX_SPECIES } from "../../module/data/pokemon-pokedex.mjs";
const dir = process.argv[2];
if (!dir) throw new Error("Pass the extracted workbook directory");
process.env.XLSX_DIR = dir;
const { sharedStrings, sheetCells, refToXY, colName } = await import("./parse.mjs");
const strings = sharedStrings();
const normalize = name => String(name ?? "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const rows = [], complete = [], skipped = [];
for (let sheet = 1; sheet <= 18; sheet++) {
  const cells = sheetCells(`sheet${sheet}.xml`, strings);
  const last = Math.max(...[...cells.keys()].map(ref => refToXY(ref).col));
  for (const [ref, value] of cells) {
    if (!/^D\d+$/.test(ref) || value !== "Nom") continue;
    const row = Number(ref.slice(1));
    const name = cells.get(`E${row}`);
    const missingStats = [2, 3, 4, 5, 6].filter(offset => !Number.isInteger(cells.get(`G${row + offset}`)));
    const trees = [];
    for (let col = 11; col <= last; col += 2) {
      const left = colName(col), right = colName(col + 1);
      if (!cells.get(`${left}${row + 1}`)) continue;
      const positions = [[left,1],[left,2],[right,2],[left,3],[left,4],[right,4],
        [left,5],[left,6],[right,6],[left,7]];
      const blank = positions.filter(([c, r]) => !String(cells.get(`${c}${row + r}`) ?? "").trim());
      trees.push({ column: left, blank: blank.map(([c,r]) => `${c}${row + r}`) });
    }
    const record = { name, sheet, row, existing: !!POKEDEX_SPECIES[normalize(name)],
      missingStats, treeCount: trees.length, incompleteTrees: trees.filter(tree => tree.blank.length) };
    rows.push(record);
    (missingStats.length || !trees.length || record.incompleteTrees.length ? skipped : complete).push(record);
  }
}
console.log(JSON.stringify({ total: rows.length, complete: complete.length, skipped: skipped.length,
  existingComplete: complete.filter(entry => entry.existing).map(({name,sheet}) => ({name,sheet})),
  completeNames: complete.map(entry => entry.name), skippedEntries: skipped }, null, 2));
