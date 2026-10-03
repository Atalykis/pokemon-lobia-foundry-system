/** Quick source audit across available Pokédex workbooks; no output files. */
import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2);
for (const root of roots) {
  process.env.XLSX_DIR = root;
  const { sharedStrings, sheetCells, refToXY } = await import(`./parse.mjs?audit=${encodeURIComponent(root)}`);
  const workbook = fs.readFileSync(path.join(root, "xl/workbook.xml"), "utf8");
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*\/>/g)];
  const strings = sharedStrings();
  const names = new Map(), issues = [], rootCounts = new Map();
  let stageCount = 0;
  for (let i = 1; i <= sheets.length; i++) {
    const cells = sheetCells(`sheet${i}.xml`, strings);
    for (const [ref, label] of cells) {
      if (!/^D\d+$/.test(ref) || label !== "Nom") continue;
      const row = Number(ref.slice(1));
      const name = cells.get(`E${row}`);
      if (!name) { issues.push(`${i}:${row}: unnamed species`); continue; }
      const locations = names.get(name) ?? [];
      locations.push(`${sheets[i - 1][1]}:${row}`);
      names.set(name, locations);
      stageCount++;
      const roots = ["K", "M", "O", "Q", "S", "U", "W"]
        .filter(column => cells.has(`${column}${row + 1}`));
      rootCounts.set(roots.length, (rootCounts.get(roots.length) ?? 0) + 1);
      if (!roots.length) issues.push(`${name}: no tree root`);
      for (const offset of [4, 5, 6]) {
        if (!cells.has(`J${row + offset}`)) issues.push(`${name}: Talent ${offset - 3} blank`);
      }
      for (const col of ["G", "H"]) if (!cells.has(`${col}${row + 1}`)) issues.push(`${name}: sex ${col} missing`);
      for (const [col, offset] of [["J", 2], ["J", 3], ["E", 2]]) {
        const value = cells.get(`${col}${row + offset}`);
        if (!value) issues.push(`${name}: ${col}${row + offset} missing`);
      }
      for (let col = 11; col <= 23; col += 2) {
        const letter = String.fromCharCode(64 + col);
        if (!cells.has(`${letter}${row + 1}`)) continue;
        for (const [offset, side] of [[1,0],[2,0],[2,1],[3,0],[4,0],[4,1],[5,0],[6,0],[6,1],[7,0]]) {
          const coordinate = `${String.fromCharCode(64 + col + side)}${row + offset}`;
          if (!cells.has(coordinate)) issues.push(`${name}: tree cell ${coordinate} blank`);
        }
      }
    }
  }
  console.log(path.basename(root), {
    sheets: sheets.length, stages: stageCount, unique: names.size,
    roots: Object.fromEntries(rootCounts),
    duplicates: [...names].filter(([, locations]) => locations.length > 1),
    issues: issues.slice(0, 35), issueCount: issues.length
  });
}
