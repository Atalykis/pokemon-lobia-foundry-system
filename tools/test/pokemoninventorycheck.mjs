/** Pokémon header slots accept one embedded objet each and never overwrite occupants. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

globalThis.foundry = { applications: { api: { HandlebarsApplicationMixin: Base => class extends Base {} },
  sheets: { ActorSheetV2: class {} } }, utils: { escapeHTML: value => String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;") } };
const warnings = [];
globalThis.ui = { notifications: { warn: message => warnings.push(message) } };
globalThis.game = { i18n: { localize: key => key } };
const created = [];
globalThis.Item = { implementation: { async createDocuments([data], { parent }) {
  const item = { id: `item-${created.length}`, type: data.type, parent,
    flags: data.flags, system: data.system, getFlag(scope, key) { return this.flags?.[scope]?.[key]; } };
  created.push(item);
  return [item];
} } };
const { default: Sheet } = await import("../../module/sheets/actor-sheet.mjs");
const { itemTooltip } = await import("../../module/data/item-tooltip.mjs");
const actor = { type: "pokemon", isOwner: true, pack: null, items: [] };
const sheet = { actor };
const drop = (slot, item) => Sheet.prototype._onDropItem.call(sheet, {
  target: { closest: selector => selector === "[data-pokemon-item-slot]"
    ? { dataset: { pokemonItemSlot: slot } } : null }
}, item);
const source = { id: "source", type: "objet", parent: null, toObject: () => ({
  _id: "source", type: "objet", system: { quantity: 4, slot: 2 }, flags: { custom: { note: 1 } }
}) };
assert.equal(await drop("held", { type: "talent" }), null);
assert.equal(warnings.at(-1), "LOBIA.Item.wrongType");
const held = await drop("held", source);
actor.items.push(held);
assert.equal(held.getFlag("lobia", "pokemonSlot"), "held");
assert.equal(held.system.quantity, 1);
assert.equal(held.system.slot, null);
assert.equal(held.flags.custom.note, 1);
assert.equal(created.length, 1);
assert.equal(await drop("held", source), null);
assert.equal(warnings.at(-1), "LOBIA.Item.slotTaken");
held.setFlag = async (scope, key, value) => { held.flags[scope][key] = value; };
assert.equal(await drop("berry", held), held);
assert.equal(held.getFlag("lobia", "pokemonSlot"), "berry");
assert.equal(created.length, 1);
actor.items.get = id => actor.items.find(item => item.id === id);
let opened = 0, removed = 0;
held.sheet = { render: () => opened++ };
held.delete = async () => { removed++; actor.items.splice(actor.items.indexOf(held), 1); };
const target = { dataset: { slot: "berry", itemId: held.id } };
Sheet.DEFAULT_OPTIONS.actions.openPokemonItem.call(sheet, null, target);
assert.equal(opened, 1);
await Sheet.DEFAULT_OPTIONS.actions.removePokemonItem.call(sheet, null, { dataset: { ...target.dataset, slot: "held" } });
assert.equal(removed, 0);
await Sheet.DEFAULT_OPTIONS.actions.removePokemonItem.call(sheet, null, target);
assert.equal(removed, 1);
actor.pack = "lobia.pokemons";
assert.equal(await drop("equipment", source), null);

const Handlebars = createRequire("/home/atalykis/Downloads/FoundryVTT-Node-13.351/")("handlebars");
Handlebars.registerHelper("localize", key => key);
Handlebars.registerHelper("selectOptions", () => "");
const header = Handlebars.compile(fs.readFileSync("templates/actor/trainer-header.hbs", "utf8"));
const tooltip = itemTooltip({ name: "Baie & miel", img: "berry.webp", system: {
  category: "baies", subcategory: "baies-general", price: 25,
  description: "<p>Rend <b>5 PV</b>.</p>" } });
assert.match(tooltip, /Baie &amp; miel/);
assert.match(tooltip, /<p>Rend <b>5 PV<\/b>\.<\/p>/);
assert.match(tooltip, /25 ₽/);
const slots = ["held", "berry", "equipment"].map(key => ({ key, label: key }));
const pokemon = header({ isPokemon: true, actor: { id: "p", name: "Flami" }, system: { hp: {} },
  pokemonItemSlots: slots.map((slot, index) => index ? slot : { ...slot, item: { id: held.id, name: "Potion", img: "potion.webp", tooltip } }),
  canEditPokemonItems: true });
assert.equal((pokemon.match(/data-pokemon-item-slot=/g) ?? []).length, 3);
assert.match(pokemon, /data-action="openPokemonItem"/);
assert.match(pokemon, /data-action="removePokemonItem"/);
assert.match(pokemon, /data-action="openPokemonItems"/);
assert.match(pokemon, /data-tooltip-html="&lt;div class&#x3D;&quot;lobia-item-tip&quot;/);
assert.match(pokemon, /data-tooltip-class="lobia-item-tooltip"/);
const trainer = header({ isTrainer: true, actor: { id: "t", name: "Dresseur" }, system: { hp: {} } });
assert.ok(!trainer.includes("data-pokemon-item-slot"));
const inventory = Handlebars.compile(fs.readFileSync("templates/actor/trainer-inventory.hbs", "utf8"))({
  weaponSlots: [{ slot: 0, index: 1, weapon: { id: "weapon", name: "Lame", img: "lame.webp", tooltip } }],
  reserve: [{ id: "reserve", name: "Baie", img: "berry.webp", tooltip }],
  buckets: [{ key: "baies", label: "Baies", groups: [{ label: "Baies",
    items: [{ id: "berry", name: "Baie", img: "berry.webp", tooltip }] }] }]
});
assert.equal((inventory.match(/data-tooltip-class="lobia-item-tooltip"/g) ?? []).length, 3);
console.log("Pokémon inventory: three header slots, item drop/move/occupancy and trainer isolation OK");
