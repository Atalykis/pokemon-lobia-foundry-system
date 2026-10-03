/** Independently compare EVERY Pokédex workbook species/tree/comment with generated data. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { TALENT_CATALOGUE } from "../../module/packs/talents-data.mjs";

const input = path.resolve(process.argv[2] ?? path.join(os.homedir(), "Downloads", "Pokedex Kanto.xlsx"));
const book = /Pokedex (\w+)\.xlsx$/i.exec(input)?.[1]?.toLowerCase();
if (!book) throw new Error(`Unknown workbook ${input}`);
const output = path.resolve(process.argv[3] ?? `module/data/pokemon-${book}-data.mjs`);
const { POKEDEX_SPECIES, POKEDEX_FAMILIES } = await import(pathToFileURL(output).href);
const EXPECTED = {
  kanto: [181, 309, 324], johto: [93, 185, 159], hoenn: [136, 273, 271],
  sinnoh: [77, 147, 125], unys: [149, 284, 237], kalos: [68, 129, 122],
  alola: [107, 241, 196], galar: [107, 214, 195], hisui: [18, 48, 46],
  paldea: [105, 245, 193], lobia: [230, 459, 502]
};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lobia-pokedex-audit-"));
process.env.XLSX_DIR = dir;
const { sharedStrings, sheetCells, refToXY, colName, decode } = await import("../xlsx/parse.mjs");
const normalize = name => String(name).toLocaleLowerCase("fr").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
const talentKeys = new Map(TALENT_CATALOGUE.map(talent => [normalize(talent.name), talent.key]));
const types = { electrique: "electrik", fee: "fee", tenebres: "tenebres" };
const positions = [
  ["root", 1, 0], ["a1", 2, 0], ["b1", 2, 1], ["mid1", 3, 0],
  ["a2", 4, 0], ["b2", 4, 1], ["mid2", 5, 0],
  ["a3", 6, 0], ["b3", 6, 1], ["end", 7, 0]
];

try {
  execFileSync("jar", ["xf", input], { cwd: dir });
  const strings = sharedStrings();
  const workbook = fs.readFileSync(path.join(dir, "xl/workbook.xml"), "utf8");
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*\/>/g)];
  const candidates = new Map();
  for (const entry of Object.values(POKEDEX_SPECIES)) {
    const source = entry.sourceName ?? entry.name;
    const list = candidates.get(source) ?? [];
    list.push(entry);
    candidates.set(source, list);
  }
  const seen = new Map();
  let speciesCount = 0, branchCount = 0, cellCount = 0, commentCount = 0, portraitCount = 0;
  for (let sheet = 1; sheet <= sheets.length; sheet++) {
    const cells = sheetCells(`sheet${sheet}.xml`, strings);
    const colLimit = Math.max(...[...cells.keys()].map(ref => refToXY(ref).col));
    const blockRows = new Map();
    const commentFile = path.join(dir, `xl/comments${sheet}.xml`);
    const xml = fs.existsSync(commentFile) ? fs.readFileSync(commentFile, "utf8") : "";
    const comments = new Map([...xml.matchAll(/<comment\b[^>]*ref="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/comment>/g)]
      .map(match => [match[1], decode([...match[2].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
        .map(run => run[1]).join(""))]));
    const portraits = new Map();
    if (book === "lobia") {
      const drawing = fs.readFileSync(path.join(dir, `xl/drawings/drawing${sheet}.xml`), "utf8");
      const rels = fs.readFileSync(path.join(dir, `xl/drawings/_rels/drawing${sheet}.xml.rels`), "utf8");
      const images = new Map([...rels.matchAll(/<Relationship\b([^>]+)\/>/g)]
        .filter(match => /\/image"/.test(match[1]))
        .map(match => [/Id="([^"]+)"/.exec(match[1])?.[1],
          path.resolve(dir, "xl/drawings", /Target="([^"]+)"/.exec(match[1])?.[1])]));
      for (const match of drawing.matchAll(/<xdr:oneCellAnchor>([\s\S]*?)<\/xdr:oneCellAnchor>/g)) {
        const anchor = match[1];
        const row = Number(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/.exec(anchor)?.[1]) + 1;
        const rel = /<a:blip\b[^>]*r:embed="([^"]+)"/.exec(anchor)?.[1];
        if (images.has(rel)) portraits.set(row, images.get(rel));
      }
    }
    for (const [ref, value] of cells) {
      if (!/^D\d+$/.test(ref) || value !== "Nom") continue;
      const row = Number(ref.slice(1));
      const name = cells.get(`E${row}`);
      if (book === "lobia") {
        const statsComplete = [2, 3, 4, 5, 6].every(offset =>
          Number.isInteger(cells.get(`G${row + offset}`)));
        const roots = [];
        for (let col = 11; col <= colLimit; col += 2) {
          if (cells.get(`${colName(col)}${row + 1}`)) roots.push(col);
        }
        const treesComplete = roots.length && roots.every(col => positions.every(([, offset, side]) =>
          String(cells.get(`${colName(col + side)}${row + offset}`) ?? "").trim()));
        if (!name || !statsComplete || !treesComplete) continue;
      }
      const occurrence = seen.get(name) ?? 0;
      const species = candidates.get(name)?.[occurrence];
      seen.set(name, occurrence + 1);
      assert.ok(species, `Unextracted species ${name} #${occurrence + 1}`);
      assert.equal(species.sourceName ?? species.name, name);
      if (book === "lobia") {
        const portrait = portraits.get(row);
        assert.equal(!!species.image, !!portrait, `${name} portrait mapping`);
        if (portrait) {
          const outputImage = path.resolve(`assets/pokemon-lg/${species.image.split("/").at(-1)}`);
          assert.ok(fs.readFileSync(outputImage).equals(fs.readFileSync(portrait)), `${name} portrait bytes`);
          portraitCount++;
        }
      }
      const read = (column, offset) => cells.get(`${column}${row + offset}`);
      const readNumber = (column, offset) => Number(read(column, offset) ?? 0);
      assert.equal(species.hpFormula, String(read("E", 2)), `${name} HP formula`);
      assert.equal(species.evolution, comments.get(`D${row + 1}`) ?? comments.get(`D${row}`) ?? "");
      assert.equal(species.evolutionHp, comments.get(`E${row + 2}`) ?? "");
      assert.deepEqual(species.sex, { male: readNumber("G", 1), female: readNumber("H", 1) });
      const sourceSize = read("J", 2);
      assert.equal(species.averageSize, /Rosélia/i.test(name) && sourceSize === "30 m" ? 30
        : Number.parseFloat(sourceSize.replace(",", ".")));
      assert.equal(species.averageWeight, Number.parseFloat(read("J", 3).replace(/[ \u00a0\u202f]/g, "").replace(",", ".")));
      assert.deepEqual(species.types, [read("G", 0), read("H", 0) ?? ""].map(type =>
        type ? (types[normalize(type)] ?? normalize(type)) : ""));
      assert.deepEqual(Object.values(species.stats), Array.from({ length: 5 }, (_, i) => readNumber("G", i + 2)));
      assert.deepEqual(Object.values(species.battle), Array.from({ length: 4 }, (_, i) => readNumber("E", i + 3)));
      assert.deepEqual(species.talents, [4, 5, 6].map(offset => {
        const source = read("J", offset) ?? "";
        return talentKeys.get(normalize(source)) ?? source;
      }));
      speciesCount++;
      const roots = [];
      for (let col = 11; col <= colLimit; col += 2) {
        if (cells.get(`${colName(col)}${row + 1}`)) roots.push(col);
      }
      const branches = Object.values(POKEDEX_FAMILIES)
        .flatMap(family => family.branches.filter(branch => branch.species === species.name));
      assert.equal(branches.length, roots.length, `Missing tree for ${name}`);
      blockRows.set(row, { name, roots, branches });
      for (const [index, col] of roots.entries()) {
        const branch = branches[index];
        for (const [id, offset, side] of positions) {
          const source = cells.get(`${colName(col + side)}${row + offset}`);
          assert.equal(branch.labels[id], source ?? "", `${name} ${branch.id} ${id}`);
          cellCount++;
        }
        branchCount++;
      }
    }
    for (const [ref, text] of comments) {
      const { col, row } = refToXY(ref);
      if (col < 11 || col > colLimit) continue;
      const start = [...blockRows.keys()].find(first => row >= first && row <= first + 7);
      assert.ok(start, `Unmatched tree comment ${sheet}:${ref}`);
      const block = blockRows.get(start);
      const rootColumn = 11 + 2 * Math.floor((col - 11) / 2);
      const index = block.roots.indexOf(rootColumn);
      assert.ok(index >= 0, `Comment on missing branch ${sheet}:${ref}`);
      const offset = row - start;
      const id = offset === 0 ? "root" : positions.find(([, r, side]) =>
        r === offset && side === col - rootColumn)?.[0];
      assert.ok(id, `Comment on missing cell ${sheet}:${ref}`);
      assert.ok(block.branches[index].notes?.[id]?.includes(text),
        `Comment lost at ${sheet}:${ref}`);
      commentCount++;
    }
  }
  assert.deepEqual([speciesCount, branchCount, commentCount], EXPECTED[book]);
  if (book === "lobia") assert.equal(portraitCount, 179);
  assert.equal(cellCount, branchCount * 10);
  console.log(`${book} source audit: ${speciesCount} species, ${branchCount} branches, ${cellCount} slots, ${commentCount} tree comments`);
  if (book === "lobia") console.log(`${portraitCount} workbook portraits verified`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
