/** Métronome uses the complete source catalogue and two transparent dice rolls. */
import assert from "node:assert/strict";
import { POKEMON_MOVES } from "../../module/data/pokemon-moves-data.mjs";

const results = [];
const events = [];
globalThis.Roll = class {
  constructor(formula) { this.formula = formula; this.total = results.shift(); }
  async evaluate() { events.push(["evaluate", this.formula]); return this; }
  async toMessage(data) { events.push(["diceMessage", this.formula, data.speaker]); }
};
globalThis.ChatMessage = {
  getSpeaker: ({ actor, token }) => ({ actor: actor?.name ?? "user", token: token?.id ?? null }),
  async create(data) { events.push(["result", data]); }
};
globalThis.game = {
  user: { character: null },
  i18n: { localize: key => key, format: (key, {type}) => `${key}: ${type}` }
};
globalThis.canvas = { tokens: { controlled: [] } };
globalThis.foundry = { utils: { escapeHTML: value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;") } };
const { rollMetronome, METRONOME_TYPES } = await import("../../module/macros/metronome.mjs");
assert.equal(new Set(METRONOME_TYPES).size, 18);
assert.deepEqual(new Set(METRONOME_TYPES), new Set(POKEMON_MOVES.map(move => move.type)));

results.push(1, 1);
const first = await rollMetronome();
assert.equal(first.type, "acier");
assert.equal(first.move.name, "Choc météore");
assert.deepEqual(events.filter(event => event[0] === "evaluate").map(event => event[1]), ["1d18", "1d47"]);
assert.equal(events.filter(event => event[0] === "diceMessage").length, 2);
assert.ok(events.find(event => event[0] === "result")[1].content.includes("Choc météore"));
assert.ok(events.find(event => event[0] === "result")[1].content.includes("Ignore les effets du talent"));

events.length = 0;
results.push(18, 39);
const actor = { name: "Togepi" };
const token = { id: "t1", actor };
canvas.tokens.controlled = [token];
const last = await rollMetronome();
assert.equal(last.type, "vol");
assert.equal(last.move.name, "Typhon hivernal");
assert.deepEqual(events.filter(event => event[0] === "evaluate").map(event => event[1]), ["1d18", "1d39"]);
assert.deepEqual(events.find(event => event[0] === "result")[1].speaker, { actor: "Togepi", token: "t1" });

// Every move is eligible exactly once, with no pasted list drifting from the workbook.
assert.equal(METRONOME_TYPES.reduce((total, type) => total + POKEMON_MOVES.filter(move => move.type === type).length, 0),
  POKEMON_MOVES.length);
console.log("Métronome: 18 source types, all moves eligible, boundary rolls and chat speaker: OK");
