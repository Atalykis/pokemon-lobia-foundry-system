/**
 * Extract Pokémon species templates and complete family trees from a Pokédex workbook.
 * Usage: node tools/xlsx/extract-pokedex.mjs "~/Downloads/Pokedex Kanto.xlsx" module/data/pokemon-kanto-data.mjs
 * An .xlsx is a ZIP. Read the ORIGINAL XML (including comments); do not save the workbook.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { TALENT_CATALOGUE } from "../../module/packs/talents-data.mjs";

const input = path.resolve((process.argv[2] ?? path.join(os.homedir(), "Downloads", "Pokedex Kanto.xlsx"))
  .replace(/^~(?=\/)/, os.homedir()));
const output = path.resolve(process.argv[3] ?? "module/data/pokemon-kanto-data.mjs");
const completeOnly = process.argv.includes("--complete-only");
const divighost = path.basename(input).toLocaleLowerCase("fr") === "divighost.xlsx";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lobia-pokedex-"));
process.env.XLSX_DIR = dir;
const { sharedStrings, sheetCells, decode, colName, refToXY } = await import("./parse.mjs");

const simplify = value => String(value ?? "").toLocaleLowerCase("fr").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
const commentName = value => simplify(value).replaceAll("degalar", "galar")
  .replaceAll("dhisui", "hisui").replaceAll("dalola", "alola");
const speciesKey = name => {
  const key = simplify(name);
  if (key === "bekaglacontetedegel") {
    return /tête de gel/i.test(name) ? "bekaglacon-tete-de-gel" : "bekaglacon-tete-degel";
  }
  return key;
};
const slug = value => String(value).toLocaleLowerCase("fr").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const talents = new Map(TALENT_CATALOGUE.map(item => [simplify(item.name), item.key]));
const TYPE_KEYS = {
  combat: "combat", dragon: "dragon", eau: "eau", electrique: "electrik", fee: "fee",
  feu: "feu", glace: "glace", insecte: "insecte", normal: "normal", plante: "plante",
  poison: "poison", psy: "psy", roche: "roche", sol: "sol", spectre: "spectre",
  vol: "vol", acier: "acier", tenebres: "tenebres"
};
const nodeCells = left => {
  const right = colName(refToXY(`${left}1`).col + 1);
  return { root: [left, 1], a1: [left, 2], b1: [right, 2], mid1: [left, 3],
    a2: [left, 4], b2: [right, 4], mid2: [left, 5],
    a3: [left, 6], b3: [right, 6], end: [left, 7] };
};
const required = (value, description) => {
  if (value === undefined || value === null || value === "") throw new Error(`Missing ${description}`);
  return value;
};
const integer = (value, description, { blankZero = false } = {}) => {
  if (blankZero && (value === undefined || value === null || value === "")) return 0;
  const result = Number(required(value, description));
  if (!Number.isInteger(result) || result < 0) throw new Error(`Invalid ${description}: ${value}`);
  return result;
};
const measure = (value, unit, description) => {
  const raw = String(value ?? "").trim().replace(/(?<=\d)[ \u00a0\u202f](?=\d{3}(?:\D|$))/g, "");
  const match = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${unit}$`, "i").exec(raw);
  if (!match && unit === "cm" && /^\d+(?:[.,]\d+)?\s*cl$/i.test(raw)) {
    console.warn(`Pokédex | ${description}: source says ${raw}; interpreting cl as cm (size column)`);
    return Number.parseFloat(raw.replace(",", "."));
  }
  if (!match && unit === "cm" && /^(?:30)\s*m$/i.test(raw) && /Rosélia/i.test(description)) {
    console.warn(`Pokédex | ${description}: source says ${raw}; interpreting as 30 cm (source typo)`);
    return 30;
  }
  if (!match && unit === "kg" && /^\d+(?:[.,]\d+)?$/.test(raw)) {
    console.warn(`Pokédex | ${description}: source omits kg after ${raw}; using kg (weight column)`);
    return Number(raw.replace(",", "."));
  }
  if (!match) throw new Error(`Invalid ${description}: ${value}`);
  return Number(match[1].replace(",", "."));
};

/** Cell remarks provide all level/evolution locks. Non-rule remarks remain visible as tooltips. */
function restriction(note, family) {
  if (!note) return null;
  const level = /(?:à partir du|au)\s+niveau\s*(\d+)/i.exec(note)?.[1];
  const evolved = /(?:après avoir évolu|tant qu[^.]*évolu)/i.test(note);
  const afterEn = /évolué\s+en\s+([^\n]+)/i.exec(note)?.[1] ?? "";
  const targetText = commentName(afterEn).replaceAll("raflesia", "rafflesia")
    .replaceAll("maturgeon", "matourgeon").replaceAll("escrocro", "escroco")
    .replaceAll("muplodocusdhisui", "muplodocushisui")
    .replaceAll("masko", "massko").replaceAll("bazoukan", "bazoucan");
  const alternate = /S['’]il évolue en ([^,]+),\s*cette capacité devient ([^\n.]+)/i.exec(note);
  const names = family.members.filter(name => (targetText.includes(commentName(name))
      || (targetText.length >= 5 && commentName(name).startsWith(targetText)))
    || (alternate && commentName(alternate[1]).includes(commentName(name))));
  // Some regional-form sheets reference an ancestor from another workbook (e.g. Pichu
  // on Raichu d'Alola). Preserve that note; it cannot gate a species absent here.
  if (afterEn && !names.length && evolved) return { externalEvolution: afterEn.trim() };
  if (!level && !evolved) return null;
  return { ...(level ? { minLevel: Number(level) } : {}),
    ...(evolved ? { requiredSpecies: names, requiresEvolution: !names.length } : {}) };
}

function alternateLabel(note, family) {
  const match = /S['’]il évolue en ([^,]+),\s*cette capacité devient ([^\n.]+)/i.exec(note);
  if (!match) return null;
  const species = family.members.find(name => commentName(match[1]).includes(commentName(name)));
  if (!species) throw new Error(`Unknown alternate evolution in comment: ${note}`);
  return { species, label: match[2].trim() };
}

function commentsForSheet(sheetNumber) {
  const relationships = path.join(dir, `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`);
  if (!fs.existsSync(relationships)) return new Map();
  const rels = fs.readFileSync(relationships, "utf8");
  const target = /<Relationship\b[^>]*Type="[^"]*\/comments"[^>]*Target="([^"]+)"/.exec(rels)?.[1];
  if (!target) return new Map();
  const xml = fs.readFileSync(path.resolve(dir, "xl/worksheets", target), "utf8");
  return new Map([...xml.matchAll(/<comment\b[^>]*ref="([A-Z]+\d+)"[^>]*>([\s\S]*?)<\/comment>/g)]
    .map(match => [match[1], decode([...match[2].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map(run => run[1]).join(""))]));
}

try {
  execFileSync("jar", ["xf", input], { cwd: dir, stdio: "pipe" });
  const strings = sharedStrings();
  const workbook = fs.readFileSync(path.join(dir, "xl/workbook.xml"), "utf8");
  const rels = fs.readFileSync(path.join(dir, "xl/_rels/workbook.xml.rels"), "utf8");
  const sheetFiles = new Map([...rels.matchAll(/<Relationship\b([^>]+)\/>/g)]
    .filter(match => /\/worksheet"/.test(match[1]))
    .map(match => [/Id="([^"]+)"/.exec(match[1])?.[1], /Target="[^"]*sheet(\d+)\.xml"/.exec(match[1])?.[1]]));
  const sheets = [...workbook.matchAll(/<sheet\b([^>]+)\/>/g)].map(match => ({
    name: decode(/name="([^"]+)"/.exec(match[1])[1]),
    number: Number(sheetFiles.get(/r:id="([^"]+)"/.exec(match[1])[1]))
  }));
  if (!sheets.length || sheets.some(sheet => !sheet.number)) throw new Error("Cannot resolve workbook sheets");
  const species = {};
  const families = {};
  const unknownTalents = new Set();
  const blankTreeCells = [];
  const skippedEntries = [];
  const images = [];
  let commentCount = 0;
  let branchCount = 0;
  for (const sheet of sheets) {
    const cells = sheetCells(`sheet${sheet.number}.xml`, strings);
    const lastColumn = Math.max(10, ...[...cells.keys()].map(ref => refToXY(ref).col));
    const treeColumns = Array.from({ length: Math.ceil((lastColumn - 10) / 2) },
      (_, index) => colName(11 + index * 2));
    const comments = commentsForSheet(sheet.number);
    const drawingFile = path.join(dir, `xl/drawings/drawing${sheet.number}.xml`);
    const drawingRelsFile = path.join(dir, `xl/drawings/_rels/drawing${sheet.number}.xml.rels`);
    const imageByRow = new Map();
    const imageByRole = new Map();
    if (completeOnly && fs.existsSync(drawingFile) && fs.existsSync(drawingRelsFile)) {
      const drawingRels = fs.readFileSync(drawingRelsFile, "utf8");
      const paths = new Map([...drawingRels.matchAll(/<Relationship\b([^>]+)\/>/g)]
        .filter(match => /\/image"/.test(match[1]))
        .map(match => [/Id="([^"]+)"/.exec(match[1])?.[1],
          path.resolve(dir, "xl/drawings", /Target="([^"]+)"/.exec(match[1])?.[1])]));
      const drawing = fs.readFileSync(drawingFile, "utf8");
      for (const match of drawing.matchAll(/<xdr:oneCellAnchor>([\s\S]*?)<\/xdr:oneCellAnchor>/g)) {
        const anchor = match[1];
        const row = Number(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/.exec(anchor)?.[1]) + 1;
        const col = Number(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/.exec(anchor)?.[1]) + 1;
        const rel = /<a:blip\b[^>]*r:embed="([^"]+)"/.exec(anchor)?.[1];
        if (rel && paths.has(rel)) {
          imageByRow.set(row, paths.get(rel));
          imageByRole.set(`${row}:${col}`, paths.get(rel));
        }
      }
    }
    const cell = (column, row) => cells.get(`${column}${row}`);
    const note = (column, row) => comments.get(`${column}${row}`) ?? "";
    const treeRow = (row, index) => divighost ? row + 8 + Math.floor(index / 2) * 8 : row;
    const headingColumn = column => divighost ? column === "E" ? "D" : "J" : column;
    const starts = [...cells].filter(([ref, value]) => /^D\d+$/.test(ref) && value === "Nom")
      .map(([ref]) => Number(ref.slice(1))).sort((a, b) => a - b);
    let family = null, previousRow = -Infinity;
    for (const row of starts) {
      if (row - previousRow > 8) family = null;
      previousRow = row;
      const sourceName = completeOnly ? cell("E", row) : required(cell("E", row), `${sheet.name} E${row}`);
      const availableTreeColumns = divighost
        ? Array.from({ length: 10 }, (_, index) => index % 2 ? "K" : "E")
        : treeColumns.filter(column => cell(column, row + 1));
      if (completeOnly) {
        const missingStats = [2, 3, 4, 5, 6].filter(offset =>
          !Number.isInteger(cell("G", row + offset)));
        const incompleteTrees = availableTreeColumns.filter((column, index) =>
          (divighost && !cell(headingColumn(column), treeRow(row, index))) || Object.values(nodeCells(column))
            .some(([letter, offset]) => !String(cell(letter, treeRow(row, index) + offset) ?? "").trim()));
        if (!sourceName || missingStats.length || !availableTreeColumns.length || incompleteTrees.length) {
          skippedEntries.push(`${sheet.name} row ${row}: ${sourceName || "(unnamed)"}`);
          continue;
        }
      }
      let name = sourceName;
      // Galar uses the same visible name for two different Bekaglaçon forms.
      // The first has high Defense / low Speed (Tête de Gel); the second is Tête Dégel.
      if (path.basename(input).toLocaleLowerCase("fr") === "pokedex galar.xlsx"
        && name === "Bekaglaçon") {
        name = cell("G", row + 4) >= 50 ? "Bekaglaçon (Tête de Gel)" : "Bekaglaçon (Tête Dégel)";
      }
      if (!family) {
        const id = slug(name);
        if (families[id]) throw new Error(`Duplicate family key ${id}`);
        family = families[id] = { members: [], branches: [] };
      }
      const familyId = slug(family.members[0] ?? name);
      const key = speciesKey(name);
      if (species[key]) throw new Error(`Duplicate species ${name} (${sheet.name} ${row})`);
      const firstType = TYPE_KEYS[simplify(cell("G", row))];
      const secondType = cell("H", row) ? TYPE_KEYS[simplify(cell("H", row))] : "";
      if (!firstType || (cell("H", row) && !secondType)) throw new Error(`Unknown types for ${name}`);
      const hpFormula = String(required(cell("E", row + 2), `${name} HP`));
      const hp = /^(\d+)\s*\+\s*Niv\((\d+)D4\)$/i.exec(hpFormula);
      if (!hp && !/^\d+$/.test(hpFormula)) throw new Error(`Unknown HP formula for ${name}: ${hpFormula}`);
      const male = cell("G", row + 1), female = cell("H", row + 1);
      if ((male === undefined) !== (female === undefined)) throw new Error(`Incomplete sex ratio for ${name}`);
      const sex = { male: integer(male, `${name} male ratio`, { blankZero: true }),
        female: integer(female, `${name} female ratio`, { blankZero: true }) };
      if (sex.male + sex.female !== 100 && sex.male + sex.female !== 0) {
        throw new Error(`Invalid sex ratio for ${name}: ${sex.male}/${sex.female}`);
      }
      const talentKeys = [4, 5, 6].map(offset => {
        const value = String(cell("J", row + offset) ?? "").trim();
        if (!value) return "";
        const key = talents.get(simplify(value));
        if (!key) unknownTalents.add(value);
        return key ?? value;
      });
      species[key] = {
        name, ...(name !== sourceName ? { sourceName } : {}),
        ...(imageByRow.has(row) ? { image: `systems/lobia/assets/pokemon-lg/${key}.png` } : {}),
        family: familyId, evolution: note("D", row + 1) || note("D", row),
        hpBase: Number(hp?.[1] ?? hpFormula), hpDice: Number(hp?.[2] ?? 0), hpFormula,
        evolutionHp: note("E", row + 2),
        types: [firstType, secondType], sex,
        averageSize: measure(cell("J", row + 2), "cm", `${name} size`),
        averageWeight: measure(cell("J", row + 3), "kg", `${name} weight`),
        stats: Object.fromEntries(["attaque", "attaqueSpeciale", "defense", "defenseSpeciale", "vitesse"]
          .map((stat, offset) => [stat, integer(cell("G", row + offset + 2), `${name} ${stat}`)])),
        battle: Object.fromEntries(["deplacement", "action", "actionBonus", "reaction"]
          .map((resource, offset) => [resource, integer(cell("E", row + offset + 3),
            `${name} ${resource}`, { blankZero: true })])),
        talents: talentKeys
      };
      if (divighost) {
        if (name !== "Divighost" || availableTreeColumns.length !== 10) {
          throw new Error("Divighost requires ten member trees");
        }
        const statNames = { "Attaque": "attaque", "Attaque Spé.": "attaqueSpeciale",
          "Défense": "defense", "Défense Spé.": "defenseSpeciale", "Vitesse": "vitesse" };
        const adjustment = (column, baseRow, offset) => {
          const text = String(cell(column, baseRow + offset) ?? "").trim();
          if (!text) return null;
          const match = /^(Attaque Spé\.|Défense Spé\.|Attaque|Défense|Vitesse) ([+-]\d+)$/.exec(text);
          if (!match) throw new Error(`Invalid Divighost member modifier: ${text}`);
          return [statNames[match[1]], Number(match[2])];
        };
        species[key].division = {
          size: 5,
          roles: Object.fromEntries(availableTreeColumns.map((column, index) => {
            const id = `${slug(name)}-${index + 1}`;
            const heading = headingColumn(column);
            const baseRow = treeRow(row, index);
            const sourceImage = imageByRole.get(`${baseRow}:${index % 2 ? 7 : 1}`);
            if (!sourceImage) throw new Error(`Missing Divighost member portrait: ${id}`);
            images.push({ key: id, source: sourceImage });
            return [id, { name: cell(heading, baseRow), image: `systems/lobia/assets/pokemon-lg/${id}.png`, stats: Object.fromEntries(
              Array.from({ length: 7 }, (_, offset) => adjustment(heading, baseRow, offset + 1)).filter(Boolean)) }];
          }))
        };
      }
      if (imageByRow.has(row)) images.push({ key, source: imageByRow.get(row) });
      family.members.push(name);
      for (const [index, column] of availableTreeColumns.entries()) {
        const mapping = nodeCells(column);
        const labels = {}, notes = {};
        const baseRow = treeRow(row, index);
        for (const [id, [letter, offset]] of Object.entries(mapping)) {
          labels[id] = String(cell(letter, baseRow + offset) ?? "");
          if (!labels[id]) blankTreeCells.push(`${name}: ${letter}${baseRow + offset} (${id})`);
          const remark = note(letter, baseRow + offset);
          if (remark) { notes[id] = remark; commentCount++; }
        }
        const headingRemark = note(headingColumn(column), baseRow);
        if (headingRemark) {
          notes.root = [headingRemark, notes.root].filter(Boolean).join("\n");
          commentCount++;
        }
        const id = availableTreeColumns.length === 1 ? slug(name)
          : `${slug(name)}-${index + 1}`;
        family.branches.push({ id, species: name,
          ...(divighost ? { title: species[key].division.roles[id].name, divisionRole: id } : {}), labels,
          ...(Object.keys(notes).length ? { notes } : {}) });
        branchCount++;
      }
    }
  }
  for (const family of Object.values(families)) {
    for (const branch of family.branches) {
      const alternateLabels = Object.fromEntries(Object.entries(branch.notes ?? {})
        .map(([id, note]) => [id, alternateLabel(note, family)]).filter(([, alternate]) => alternate));
      if (Object.keys(alternateLabels).length) branch.alternateLabels = alternateLabels;
      const rules = Object.fromEntries(Object.entries(branch.notes ?? {})
        .map(([id, note]) => [id, restriction(note, family)]).filter(([, value]) => value));
      if (rules.root?.minLevel) branch.minLevel = rules.root.minLevel;
      if (rules.root?.requiredSpecies?.length) branch.requiredSpecies = rules.root.requiredSpecies;
      if (rules.root?.requiresEvolution) branch.requiresEvolution = true;
      delete rules.root;
      if (Object.keys(rules).length) branch.nodeRestrictions = rules;
    }
  }
  const isKanto = path.basename(input).toLocaleLowerCase("fr") === "pokedex kanto.xlsx";
  if (!Object.keys(species).length || !branchCount || (isKanto
    && (Object.keys(species).length !== 181 || branchCount !== 309))) {
    throw new Error(`Unexpected Kanto workbook counts: ${Object.keys(species).length} species, ${branchCount} branches`);
  }
  if (images.length) {
    const imageDir = path.resolve(path.dirname(output), "../../assets/pokemon-lg");
    fs.mkdirSync(imageDir, { recursive: true });
    for (const image of images) {
      if (!fs.existsSync(image.source)) throw new Error(`Missing workbook portrait for ${image.key}: ${image.source}`);
      fs.copyFileSync(image.source, path.join(imageDir, `${image.key}.png`));
    }
  }
  const text = `/** Generated by tools/xlsx/extract-pokedex.mjs from ${path.basename(input)}. Do not edit by hand. */\n`
    + `export const POKEDEX_SPECIES = ${JSON.stringify(species, null, 2)};\n`
    + `export const POKEDEX_FAMILIES = ${JSON.stringify(families, null, 2)};\n`;
  fs.writeFileSync(output, text);
  const imported = await import(`${pathToFileURL(output).href}?check=${Date.now()}`);
  if (Object.keys(imported.POKEDEX_SPECIES).length !== Object.keys(species).length
    || Object.values(imported.POKEDEX_FAMILIES).reduce((sum, family) => sum + family.branches.length, 0) !== branchCount) {
    throw new Error("Generated Pokédex module verification failed");
  }
  console.log(`Pokédex: ${sheets.length} sheets, ${Object.keys(species).length} species, ${Object.keys(families).length} families, ${branchCount} branches, ${commentCount} tree comments`);
  console.log(`Talents without catalogue matches: ${[...unknownTalents].join(", ") || "none"}`);
  if (images.length) console.log(`Copied ${images.length} workbook portraits into assets/pokemon-lg`);
  if (skippedEntries.length) console.log(`Skipped ${skippedEntries.length} incomplete entries: ${skippedEntries.join(", ")}`);
  if (blankTreeCells.length) console.warn(`Pokédex | Blank tree cells retained as unavailable: ${blankTreeCells.join(", ")}`);
  console.log(`Wrote ${output}`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
