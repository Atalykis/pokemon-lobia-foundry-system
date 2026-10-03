/** Quick-roll Macro: token selection, real stat API, optional damage and chat speaker. */
import assert from "node:assert/strict";

const calls = [];
let doDamage = true;
globalThis.foundry = {
  applications: { api: { DialogV2: {
    async wait(config) {
      if (config.buttons.some(button => button.action === "attaque")) {
        assert.equal(config.buttons.length, 5);
        return config.buttons.find(button => button.action === "attaque")
          .callback(null, { form: { elements: { quantity: { value: "2" }, modifier: { value: "5" } } } });
      }
      assert.ok(config.content.includes("Physique (+7)"));
      return config.buttons.find(button => button.action === "d8")
        .callback(null, { form: { elements: { quantity: { value: "2" }, modifier: { value: "-3" } } } });
    },
    async confirm() { return doDamage; }
  } } },
  utils: { escapeHTML: value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;") }
};
globalThis.game = { i18n: {
  localize: key => key === "LOBIA.Derived.physique" ? "Physique" : key,
  format: (key, data) => `${key} ${data.name ?? ""}`
}, user: { isGM: false, character: null } };
globalThis.ui = { notifications: { warn: text => calls.push(["warn", text]) } };
globalThis.ChatMessage = { getSpeaker: ({ actor, token }) => ({ actor: actor.name, token: token?.id }) };
globalThis.Roll = class {
  constructor(formula) { this.formula = formula; }
  async evaluate() { calls.push(["roll", this.formula]); return this; }
  async toMessage(data) { calls.push(["message", data]); }
};
const actor = { name: "Pikachu", isOwner: true, system: {
  stats: { attaque: {}, attaqueSpeciale: {}, defense: {}, defenseSpeciale: {}, vitesse: {} },
  derived: { physique: { total: 7 }, special: { total: -3 } }
}, async rollStat(key, options) { calls.push(["stat", key, options]); } };
globalThis.canvas = { tokens: { controlled: [{ id: "token-1", actor }] } };

const { quickRoll } = await import("../../module/macros/quick-roll.mjs");
await quickRoll();
assert.deepEqual(calls.slice(0, 3), [
  ["stat", "attaque", { modifier: 5 }], ["stat", "attaque", { modifier: 5 }], ["roll", "2d8-3"]
]);
assert.deepEqual(calls[3][1].speaker, { actor: "Pikachu", token: "token-1" });
assert.ok(!calls.some(call => call[0] === "warn"));

calls.length = 0;
actor.system.combatStyle = "puissant";
await quickRoll();
assert.deepEqual(calls.find(call => call[0] === "roll"), ["roll", "(2d8-3)*2"]);
calls.length = 0;
actor.system.combatStyle = "defensif";
await quickRoll();
assert.deepEqual(calls.find(call => call[0] === "roll"), ["roll", "floor((2d8-3)/2)"]);
actor.system.combatStyle = "neutre";

calls.length = 0;
doDamage = false;
await quickRoll();
assert.equal(calls.filter(call => call[0] === "stat").length, 2);
assert.equal(calls.filter(call => call[0] === "roll").length, 0);

calls.length = 0;
canvas.tokens.controlled = [{ id: "one", actor }, { id: "two", actor }];
await quickRoll();
assert.equal(calls.length, 1);
assert.equal(calls[0][0], "warn");

calls.length = 0;
canvas.tokens.controlled = [];
game.user.character = actor;
await quickRoll();
assert.equal(calls.filter(call => call[0] === "stat").length, 2);
console.log("Quick-roll Macro: selected token, actor checks, optional damage and fallback character: OK");
