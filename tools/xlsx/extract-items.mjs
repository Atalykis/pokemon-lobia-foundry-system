/**
 * Read Objects.xlsx (5 sheets, one per big category) and emit the Lobia item
 * catalogue as a JS data module.
 *
 *   XLSX_DIR=<unzipped xlsx> node extract-items.mjs <system>/module/packs
 *
 * Sheet layout: row 1 is "Nom | Prix | Description"; a row carrying only an A cell
 * (no B/C cells at all) is a sub-category heading; every other row is one item.
 */
import fs from "node:fs";
import { sheetRows, sharedStrings } from "./cells.mjs";

const OUT_DIR = process.argv[2];

/** Sheet file -> the big category it feeds. */
const SHEETS = {
  "sheet1.xml": "pokeball",
  "sheet2.xml": "bonus",
  "sheet3.xml": "arme",
  "sheet4.xml": "accessoire",
  "sheet5.xml": "recharge"
};

/** Heading text exactly as the spreadsheet writes it -> taxonomy sub-category key. */
const HEADINGS = {
  "Poké Ball standard": "pokeball-standard",
  "Poké Ball lié au poids": "pokeball-poids",
  "Poké Ball spécial": "pokeball-speciale",
  "Poké Ball illégal": "pokeball-illegale",

  "Objet de soin": "bonus-soin",
  "Objet de combat": "bonus-combat",
  "Accélérateur": "bonus-accelerateur",
  "Plumes": "bonus-plumes",

  "Knocker": "arme-knocker",
  "Shooter": "arme-shooter",
  "Slasher": "arme-slasher",
  "Blocker": "arme-blocker",
  "Healer": "arme-healer",
  "Modificateur": "arme-modificateur",
  "Arme Medieval": "arme-medieval",
  "Armure Medieval": "arme-armure",

  "Boost charge": "accessoire-boost",
  "Power charge": "accessoire-power",
  "Accessoire de météo": "accessoire-meteo",
  "Accessoire spéciale": "accessoire-special",

  "Recharge standard": "recharge-standard",
  "Recharge de statut": "recharge-statut"
};

/**
 * Sub-categories whose rows are skipped. The two medieval sections exist in the
 * spreadsheet but are unfinished (no prices, most rows without a description) and
 * were deleted from the world compendium by hand — keeping them here would let a
 * re-import resurrect them. Empty this list once the source rows are filled in.
 */
const EXCLUDED_SUBS = new Set(["arme-medieval", "arme-armure"]);

/** "15 000" -> 15000, "---" -> 0 (not for sale). */
function toPrice(raw) {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).replace(/[\s ]/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return 0;
  return Math.max(0, Math.trunc(Number(s)));
}

const escape = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain cell text -> one <p> per line. */
function toHtml(raw) {
  if (!raw) return "";
  return String(raw).split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => `<p>${escape(l)}</p>`).join("");
}

const strings = sharedStrings();
const items = [];
const problems = [];
let excluded = 0;
const stats = {};

for (const [file, category] of Object.entries(SHEETS)) {
  let sub = null;
  for (const row of sheetRows(file, strings)) {
    if (row.row < 2 || !row.a) continue;
    const name = String(row.a).trim();

    // Sub-category heading: an A cell with no B/C cells beside it.
    if (!row.hasBC) {
      sub = HEADINGS[name] ?? null;
      if (!sub) problems.push(`${file} row ${row.row}: unknown heading "${name}"`);
      else if (!sub.startsWith(`${category}-`)) problems.push(`${file} row ${row.row}: "${name}" -> ${sub} is not a ${category}`);
      continue;
    }

    if (!sub) { problems.push(`${file} row ${row.row}: "${name}" before any heading`); continue; }
    if (EXCLUDED_SUBS.has(sub)) { excluded++; continue; }

    items.push({
      name,
      subcategory: sub,
      price: toPrice(row.b),
      description: toHtml(row.c)
    });
    stats[sub] ??= { n: 0, priced: 0, described: 0 };
    stats[sub].n++;
    if (row.b && String(row.b).trim() !== "---") stats[sub].priced++;
    if (row.c) stats[sub].described++;
  }
}

// Duplicate names would collide on import (importItems matches on name).
const seen = new Map();
for (const it of items) {
  if (seen.has(it.name)) problems.push(`duplicate name "${it.name}" (${seen.get(it.name)} and ${it.subcategory})`);
  else seen.set(it.name, it.subcategory);
}

const header = `/**
 * The Lobia item catalogue, generated from Objects.xlsx — DO NOT HAND-EDIT.
 * Regenerate with scratchpad/extract-items.mjs (see HANDOFF §7).
 *
 * ${items.length} items. Each carries the three catalogue fields the spreadsheet
 * holds: name, price and description.
 */
export const ITEM_CATALOGUE = `;

fs.writeFileSync(`${OUT_DIR}/items-data.mjs`, header + JSON.stringify(items, null, 2) + ";\n");

console.log(`items: ${items.length}  (excluded ${excluded} rows from ${[...EXCLUDED_SUBS].join(", ")})`);
for (const [k, v] of Object.entries(stats)) {
  console.log(`  ${k.padEnd(22)} ${String(v.n).padStart(3)}  priced ${String(v.priced).padStart(3)}  described ${String(v.described).padStart(3)}`);
}
console.log(problems.length ? `\nPROBLEMS:\n  ${problems.join("\n  ")}` : "\nno problems");

// Read the file back and fail loudly if what landed on disk is not what we built.
const written = await import(`file://${OUT_DIR}/items-data.mjs?t=${Date.now()}`);
if (written.ITEM_CATALOGUE.length !== items.length) {
  console.error(`\n✗ WRITE MISMATCH: built ${items.length} items but the file holds ${written.ITEM_CATALOGUE.length}`);
  process.exit(1);
}
console.log(`\n✓ verified on disk: ${written.ITEM_CATALOGUE.length} items`);
