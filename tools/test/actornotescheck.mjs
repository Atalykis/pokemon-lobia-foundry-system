import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { gmNotesFor, saveGmNotes } from "../../module/sheets/actor-notes.mjs";

const journal = [];
globalThis.game = { user: { isGM: true }, journal };
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0 } };
globalThis.foundry = { utils: { escapeHTML: text => text.replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;") } };
globalThis.DOMParser = class {
  parseFromString(html) {
    return { querySelector: () => ({ textContent: html.replace(/^<pre>|<\/pre>$/g, "")
      .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&") }) };
  }
};
globalThis.JournalEntry = { async create(data) {
  assert.equal(data.ownership.default, 0);
  const page = { text: data.pages[0].text, async update(change) { this.text.content = change["text.content"]; } };
  const entry = { getFlag: (_, key) => data.flags.lobia[key], pages: { contents: [page] } };
  journal.push(entry);
  return entry;
} };

const actor = { uuid: "Actor.notesTest", name: "Notes Test" };
await saveGmNotes(actor, "First <secret>\nsecond");
assert.equal(gmNotesFor(actor), "First <secret>\nsecond");
await saveGmNotes(actor, "Updated");
assert.equal(journal.length, 1);
assert.equal(gmNotesFor(actor), "Updated");
game.user.isGM = false;
await saveGmNotes(actor, "Player overwrite");
assert.equal(gmNotesFor(actor), "Updated");

const require = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/");
const Handlebars = require("handlebars");
Handlebars.registerHelper("localize", key => key);
for (const file of ["notes", "gm-notes"]) {
  const template = Handlebars.compile(fs.readFileSync(`templates/actor/${file}.hbs`, "utf8"));
  const context = { tab: { id: file, group: "sheet", active: true }, actor: { id: "A" },
    system: { notes: "Player <entry>" }, gmNotes: "GM <secret>" };
  const player = template({ ...context, isGM: false });
  assert.match(player.trim(), /^<section[\s\S]*<\/section>$/);
  assert.doesNotMatch(player, /GM &lt;secret&gt;|saveGmNotes/);
  const gm = template({ ...context, isGM: true });
  assert.match(gm.trim(), /^<section[\s\S]*<\/section>$/);
  if (file === "gm-notes") assert.match(gm, /GM &lt;secret&gt;/);
  else assert.match(player, /name="system.notes"/);
}
console.log("Actor notes: private journal, GM guard, and both tab templates: OK");
