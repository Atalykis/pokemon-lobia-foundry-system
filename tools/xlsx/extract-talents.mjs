/**
 * Talents.xlsx -> module/packs/talents-data.mjs
 * Usage: node tools/xlsx/extract-talents.mjs [path-to-Talents.xlsx]
 * Requires `jar` to unpack XLSX ZIP contents into a temporary directory.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const source = path.resolve(process.argv[2] ?? path.join(os.homedir(), "Downloads", "Talents.xlsx"));
const output = path.resolve("module/packs/talents-data.mjs");
if (!fs.existsSync(source)) throw new Error(`Workbook not found: ${source}`);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "lobia-talents-"));

try {
  execFileSync("jar", ["xf", source], { cwd: temp });
  process.env.XLSX_DIR = temp;
  const { sheetCells, sharedStrings, refToXY, decode } = await import("./parse.mjs");
  const strings = sharedStrings();
  const workbook = fs.readFileSync(path.join(temp, "xl/workbook.xml"), "utf8");
  const rels = fs.readFileSync(path.join(temp, "xl/_rels/workbook.xml.rels"), "utf8");
  const targets = new Map([...rels.matchAll(/<Relationship\b([^>]*?)\/>/g)]
    .map(([, attrs]) => [/\bId="([^"]+)"/.exec(attrs)?.[1], /\bTarget="([^"]+)"/.exec(attrs)?.[1]]));
  const sheets = [...workbook.matchAll(/<sheet\b([^>]*?)\/>/g)].map(([, attrs]) => {
    const name = decode(/\bname="([^"]+)"/.exec(attrs)?.[1] ?? "");
    const id = /\br:id="([^"]+)"/.exec(attrs)?.[1];
    const target = targets.get(id);
    if (!target?.match(/(?:^|\/)sheet\d+\.xml$/)) throw new Error(`Unknown worksheet for ${name}: ${id}`);
    return { name, file: path.basename(target) };
  });
  if (sheets.length < 2 || sheets[0].name !== "Introduction") throw new Error("Expected Introduction followed by category sheets");

  function rowsOf(file) {
    const rows = new Map();
    for (const [ref, value] of sheetCells(file, strings)) {
      const { row, col } = refToXY(ref);
      (rows.get(row) ?? rows.set(row, {}).get(row))[col] = String(value).trim();
    }
    return [...rows.entries()].sort(([a], [b]) => a - b);
  }

  const slug = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const intro = rowsOf(sheets[0].file);
  const categoryDescriptions = new Map(intro.filter(([row]) => row >= 4).map(([, cells]) => [cells[1], cells[2]]));
  const introduction = intro.find(([row]) => row === 2)?.[1]?.[1] ?? "";
  if (!introduction) throw new Error("Missing workbook introduction");
  const categories = [];
  const talents = [];
  const keys = new Set();
  for (const sheet of sheets.slice(1)) {
    const description = categoryDescriptions.get(sheet.name);
    if (!description) throw new Error(`Missing introduction for category "${sheet.name}"`);
    const category = slug(sheet.name);
    categories.push({ key: category, name: sheet.name, description });
    for (const [row, cells] of rowsOf(sheet.file)) {
      if (row === 1) continue;
      const [name, effect] = [cells[1], cells[2]];
      if (!name && !effect) continue;
      if (!name || !effect || Object.keys(cells).some(col => Number(col) > 2)) {
        throw new Error(`${sheet.name} row ${row}: expected Name | Effect, got ${JSON.stringify(cells)}`);
      }
      const key = slug(name);
      if (!key || keys.has(key)) throw new Error(`Duplicate or empty talent key "${key}" (${sheet.name} row ${row})`);
      keys.add(key);
      talents.push({ key, category, name, effect });
    }
  }
  if (categoryDescriptions.size !== categories.length) throw new Error("Introduction and worksheet categories do not match");
  if (categories.length !== 17 || talents.length !== 374) {
    throw new Error(`Unexpected category/talent count: ${categories.length}/17, ${talents.length}/374`);
  }

  const data = `// AUTO-GENERATED from Talents.xlsx by tools/xlsx/extract-talents.mjs. Do not hand-edit.\n`
    + `export const TALENT_INTRODUCTION = ${JSON.stringify(introduction)};\n`
    + `export const TALENT_CATEGORIES = ${JSON.stringify(categories, null, 2)};\n`
    + `export const TALENT_CATALOGUE = ${JSON.stringify(talents, null, 2)};\n`;
  fs.writeFileSync(output, data);
  const written = await import(`${pathToFileURL(output)}?v=${Date.now()}`);
  if (written.TALENT_CATEGORIES.length !== categories.length || written.TALENT_CATALOGUE.length !== talents.length) {
    throw new Error("Generated catalogue failed on-disk verification");
  }
  console.log(`Talents: ${talents.length} entries across ${categories.length} categories (verified on disk)`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
