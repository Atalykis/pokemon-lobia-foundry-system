/** Check Divighost's unusual vertical tree layout, modifiers, notes and portrait against its workbook. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { POKEDEX_SPECIES, POKEDEX_FAMILIES } from "../../module/data/pokemon-divighost-data.mjs";

const workbook = path.resolve(process.argv[2] ?? path.join(os.homedir(), "Downloads/Divighost.xlsx"));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "divighost-audit-"));
process.env.XLSX_DIR = dir;
try {
  execFileSync("jar", ["xf", workbook], { cwd: dir });
  const { sharedStrings, sheetCells, decode } = await import("../xlsx/parse.mjs");
  const cells = sheetCells("sheet1.xml", sharedStrings());
  const species = POKEDEX_SPECIES.divighost;
  const branches = POKEDEX_FAMILIES.divighost.branches;
  assert.equal(species.name, cells.get("E1"));
  assert.deepEqual(species.types, ["combat", "spectre"]);
  assert.deepEqual(Object.values(species.stats), [3, 4, 5, 6, 7].map(row => cells.get(`G${row}`)));
  assert.equal(species.division.size, 5);
  assert.equal(branches.length, 10);
  const statNames = { "Attaque": "attaque", "Attaque Spé.": "attaqueSpeciale",
    "Défense": "defense", "Défense Spé.": "defenseSpeciale", "Vitesse": "vitesse" };
  const positions = { root: [1, 0], a1: [2, 0], b1: [2, 1], mid1: [3, 0],
    a2: [4, 0], b2: [4, 1], mid2: [5, 0], a3: [6, 0], b3: [6, 1], end: [7, 0] };
  const commentsXml = fs.readFileSync(path.join(dir, "xl/comments1.xml"), "utf8");
  const comments = new Map([...commentsXml.matchAll(/<comment\b[^>]*ref="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/comment>/g)]
    .map(match => [match[1], decode([...match[2].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map(run => run[1]).join(""))]));
  const drawing = fs.readFileSync(path.join(dir, "xl/drawings/drawing1.xml"), "utf8");
  const relationships = fs.readFileSync(path.join(dir, "xl/drawings/_rels/drawing1.xml.rels"), "utf8");
  const targets = new Map([...relationships.matchAll(/<Relationship\b([^>]+)\/>/g)].map(match => [
    /Id="([^"]+)"/.exec(match[1])?.[1], /Target="([^"]+)"/.exec(match[1])?.[1]
  ]));
  const portraits = new Map([...drawing.matchAll(/<xdr:oneCellAnchor>([\s\S]*?)<\/xdr:oneCellAnchor>/g)]
    .map(match => {
      const anchor = match[1];
      const row = Number(/<xdr:row>(\d+)<\/xdr:row>/.exec(anchor)?.[1]) + 1;
      const col = Number(/<xdr:col>(\d+)<\/xdr:col>/.exec(anchor)?.[1]) + 1;
      const rel = /r:embed="([^"]+)"/.exec(anchor)?.[1];
      return [`${row}:${col}`, path.resolve(dir, "xl/drawings", targets.get(rel))];
    }));
  assert.equal(species.evolution, comments.get("D2"));
  for (const [index, branch] of branches.entries()) {
    const base = 9 + Math.floor(index / 2) * 8;
    const heading = index % 2 ? "J" : "D";
    const left = index % 2 ? "K" : "E";
    const right = index % 2 ? "L" : "F";
    assert.equal(branch.id, `divighost-${index + 1}`);
    assert.equal(branch.title, cells.get(`${heading}${base}`));
    assert.equal(species.division.roles[branch.id].name, branch.title);
    assert.equal(species.division.roles[branch.id].image,
      `systems/lobia/assets/pokemon-lg/${branch.id}.png`);
    assert.ok(fs.readFileSync(`assets/pokemon-lg/${branch.id}.png`)
      .equals(fs.readFileSync(portraits.get(`${base}:${index % 2 ? 7 : 1}`))));
    const modifiers = {};
    for (let offset = 1; offset <= 7; offset++) {
      const text = cells.get(`${heading}${base + offset}`);
      if (!text) continue;
      const match = /^(Attaque Spé\.|Défense Spé\.|Attaque|Défense|Vitesse) ([+-]\d+)$/.exec(text);
      assert.ok(match, `${heading}${base + offset}: ${text}`);
      modifiers[statNames[match[1]]] = Number(match[2]);
    }
    assert.deepEqual(species.division.roles[branch.id].stats, modifiers);
    for (const [node, [offset, side]] of Object.entries(positions)) {
      const ref = `${side ? right : left}${base + offset}`;
      assert.equal(branch.labels[node], cells.get(ref), ref);
      assert.equal(branch.notes?.[node] ?? "", comments.get(ref) ?? (node === "root" ? comments.get(`${heading}${base}`) ?? "" : ""));
    }
  }
  assert.equal(portraits.size, 11);
  assert.ok(fs.readFileSync("assets/pokemon-lg/divighost.png")
    .equals(fs.readFileSync(portraits.get("1:1"))));
  console.log("Divighost workbook: 10 roles, 100 nodes, modifiers, comments and 11 portraits: OK");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
