import { sharedStrings, sheetCells, refToXY, colName } from "./parse.mjs";
const [, , , sheet, from, to, width = 120] = process.argv;
const strings = sharedStrings();
const cells = sheetCells(sheet, strings);
const rows = new Map();
for (const [ref, v] of cells) { const { col, row } = refToXY(ref); if (!rows.has(row)) rows.set(row, {}); rows.get(row)[col] = v; }
for (const r of [...rows.keys()].sort((a, b) => a - b)) {
  if (r < Number(from) || r > Number(to)) continue;
  const o = rows.get(r);
  console.log(String(r).padStart(4), Object.entries(o).map(([c, v]) => `${colName(+c)}=${JSON.stringify(String(v)).slice(0, Number(width))}`).join("  "));
}
