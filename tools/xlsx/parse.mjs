import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = process.env.XLSX_DIR ?? process.argv[2];

/** Decode the XML entities Excel emits. */
export function decode(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** sharedStrings.xml -> array of plain strings (runs concatenated, <br> for line breaks). */
export function sharedStrings() {
  const xml = fs.readFileSync(`${DIR}/xl/sharedStrings.xml`, "utf8");
  const out = [];
  for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    const parts = [];
    for (const m of si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) parts.push(decode(m[1]));
    out.push(parts.join(""));
  }
  return out;
}

/** A sheet as a map of "A1" -> value (strings resolved, numbers as numbers). */
export function sheetCells(file, strings) {
  const xml = fs.readFileSync(`${DIR}/xl/worksheets/${file}`, "utf8");
  const cells = new Map();
  // Self-closing cells must not swallow the cells that follow them.
  for (const m of xml.matchAll(/<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1] ?? "";
    const body = m[2] ?? "";
    const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
    if (!ref) continue;
    const type = /t="([^"]+)"/.exec(attrs)?.[1];
    let value = null;
    if (type === "s") {
      const idx = /<v>(\d+)<\/v>/.exec(body)?.[1];
      if (idx !== undefined) value = strings[Number(idx)] ?? "";
    } else if (type === "inlineStr") {
      const parts = [...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x => decode(x[1]));
      value = parts.join("");
    } else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      if (v !== undefined) value = isNaN(Number(v)) ? decode(v) : Number(v);
    }
    if (value !== null && value !== "") cells.set(ref, value);
  }
  return cells;
}

/** "B12" -> {col: 2, row: 12} (1-indexed column). */
export function refToXY(ref) {
  const [, letters, row] = /^([A-Z]+)(\d+)$/.exec(ref);
  let col = 0;
  for (const ch of letters) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(row) };
}

export function colName(n) {
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Print a sheet as a row-major grid for inspection. */
export function dump(file, strings, maxRows = 200) {
  const cells = sheetCells(file, strings);
  const rows = new Map();
  let maxCol = 0;
  for (const [ref, v] of cells) {
    const { col, row } = refToXY(ref);
    maxCol = Math.max(maxCol, col);
    if (!rows.has(row)) rows.set(row, new Map());
    rows.get(row).set(col, v);
  }
  const sorted = [...rows.keys()].sort((a, b) => a - b).slice(0, maxRows);
  for (const r of sorted) {
    const line = [];
    for (let c = 1; c <= maxCol; c++) {
      const v = rows.get(r).get(c);
      if (v !== undefined) line.push(`${colName(c)}${r}=${JSON.stringify(String(v)).slice(0, 90)}`);
    }
    if (line.length) console.log(line.join(" | "));
  }
}

if (process.argv[3] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dump(process.argv[3], sharedStrings(), Number(process.argv[4] ?? 200));
}
