import fs from "node:fs";
import { sharedStrings, decode, refToXY, colName } from "./parse.mjs";

const DIR = process.env.XLSX_DIR;

/** Every cell of a sheet as { value, style }, keyed "A1". Empty cells are kept (value null). */
export function sheetGrid(file, strings) {
  const xml = fs.readFileSync(`${DIR}/xl/worksheets/${file}`, "utf8");
  const grid = new Map();
  for (const m of xml.matchAll(/<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1] ?? "";
    const body = m[2] ?? "";
    const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
    if (!ref) continue;
    const style = /s="(\d+)"/.exec(attrs)?.[1] ?? null;
    const type = /t="([^"]+)"/.exec(attrs)?.[1];
    let value = null;
    if (type === "s") {
      const i = /<v>(\d+)<\/v>/.exec(body)?.[1];
      if (i !== undefined) value = strings[Number(i)] ?? "";
    } else if (type === "inlineStr") {
      value = [...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x => decode(x[1])).join("");
    } else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      if (v !== undefined) value = decode(v);
    }
    grid.set(ref, { value: (value === "" ? null : value), style, present: true });
  }
  return grid;
}

/** Rows as { row, a, b, c, styleA, hasBC } sorted by row number. */
export function sheetRows(file, strings) {
  const grid = sheetGrid(file, strings);
  const rows = new Map();
  for (const [ref, cell] of grid) {
    const { col, row } = refToXY(ref);
    if (col > 3) continue;
    if (!rows.has(row)) rows.set(row, { row });
    const r = rows.get(row);
    r[["a", "b", "c"][col - 1]] = cell.value;
    if (col === 1) r.styleA = cell.style;
    if (col > 1) r.hasBC = true;
  }
  return [...rows.values()].sort((x, y) => x.row - y.row);
}

export { sharedStrings, colName };
