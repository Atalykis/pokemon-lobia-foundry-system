/** Extract the 18 type-specific ten-cell trees and cell remarks from Arbre-dominant.xlsx. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const input = path.resolve(process.argv[2] ?? path.join(os.homedir(), "Downloads/Arbre-dominant.xlsx"));
const output = path.resolve(process.argv[3] ?? "module/data/pokemon-dominant-data.mjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lobia-dominant-"));
process.env.XLSX_DIR = dir;
const { sharedStrings, sheetCells, decode, colName } = await import("./parse.mjs");
const typeKeys = {
  Acier: "acier", Combat: "combat", Dragon: "dragon", Eau: "eau", Electrique: "electrik",
  "Fée": "fee", Feu: "feu", Glace: "glace", Insecte: "insecte", Normal: "normal",
  Plante: "plante", Poison: "poison", Psy: "psy", Roche: "roche", Sol: "sol",
  Spectre: "spectre", "Ténèbres": "tenebres", Vol: "vol"
};
const nodeOffsets = { root: [0, 1], a1: [0, 2], b1: [1, 2], mid1: [0, 3],
  a2: [0, 4], b2: [1, 4], mid2: [0, 5], a3: [0, 6], b3: [1, 6], end: [0, 7] };

try {
  execFileSync("jar", ["xf", input], { cwd: dir });
  const cells = sheetCells("sheet1.xml", sharedStrings());
  const xml = fs.readFileSync(path.join(dir, "xl/comments1.xml"), "utf8");
  const comments = new Map([...xml.matchAll(/<comment\b[^>]*ref="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/comment>/g)]
    .map(([, ref, body]) => [ref, decode([...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map(match => match[1]).join(""))]));
  const trees = {};
  for (const start of [4, 12, 20]) {
    for (const left of [2, 4, 6, 8, 10, 12]) {
      const ref = (column, row) => `${colName(left + column)}${start + row}`;
      const type = typeKeys[cells.get(ref(0, 0))];
      if (!type || trees[type]) throw new Error(`Unknown or duplicate type at ${ref(0, 0)}`);
      const labels = {}, notes = {};
      for (const [node, [col, row]] of Object.entries(nodeOffsets)) {
        const cell = ref(col, row);
        const label = cells.get(cell);
        if (typeof label !== "string" || !label.trim()) throw new Error(`Missing ${type} ${node} at ${cell}`);
        labels[node] = label.trim();
        if (comments.has(cell)) notes[node] = comments.get(cell).trim();
      }
      trees[type] = { labels, notes };
    }
  }
  if (Object.keys(trees).length !== 18) throw new Error("Expected exactly 18 Dominant trees");
  fs.writeFileSync(output, `/** Generated from Arbre-dominant.xlsx by tools/xlsx/extract-dominant.mjs. */\n` +
    `export const POKEMON_DOMINANT_TREES = ${JSON.stringify(trees, null, 2)};\n`);
  console.log(`Extracted ${Object.keys(trees).length} Dominant trees into ${output}`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
