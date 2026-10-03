/** Exercise the one-time PV + roll through unlock, lock, and reset. */
function applyPath(root, path, value) {
  const parts = path.split(".");
  let target = root;
  for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] ??= {};
  const key = parts.at(-1);
  if (key.startsWith("-=")) delete target[key.slice(2)];
  else target[key] = value;
}

globalThis.Actor = class {
  constructor(data) { Object.assign(this, data); }
  async update(changes) {
    for (const [path, value] of Object.entries(changes)) applyPath(this, path, value);
    this.system.hp.bonus = Object.values(this.system.treeRolls).reduce((sum, value) => sum + value, 0);
    this.system.hp.max = this.system.hp.base + this.system.hp.bonus;
    return this;
  }
};
globalThis.Roll = class {
  constructor(formula) { this.formula = formula; this.total = 6; }
  async evaluate() { return this; }
  async toMessage(data) { this.messageData = data; }
};
globalThis.ChatMessage = { getSpeaker: ({ actor }) => ({ actor: actor.name }) };
globalThis.foundry = {
  utils: {
    deepClone: value => structuredClone(value),
    isEmpty: value => Object.keys(value).length === 0
  },
  applications: { api: { DialogV2: { confirm: async () => true } } }
};
globalThis.game = {
  i18n: {
    localize: key => key,
    format: (key, data) => `${key}:${JSON.stringify(data)}`
  }
};
globalThis.ui = { notifications: { warn() {} } };

const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
const { default: LobiaActor } = await import(`${SYS}/module/documents/actor.mjs`);

const actor = new LobiaActor({
  name: "Test",
  type: "trainer",
  system: {
    hp: { value: 10, base: 10, bonus: 0, max: 10 },
    branches: ["normal"],
    trees: { normal: {} },
    treeRolls: {},
    skills: {},
    skillStepsSpent: 0,
    isNodeAvailable: (branch, nodeId) => branch === "normal" && nodeId === "b2a"
  }
});

await actor.unlockTreeNode("normal", "b2a");
console.log("PV + uses 2d4 and stores its result:", actor.system.treeRolls["normal-b2a"] === 6);
console.log("unlock raises current and maximum PV:", actor.system.hp.value === 16 && actor.system.hp.max === 16);

await actor.lockTreeNode("normal", "b2a");
console.log("lock removes the stored result:", !("normal-b2a" in actor.system.treeRolls));
console.log("lock reverses current and maximum PV:", actor.system.hp.value === 10 && actor.system.hp.max === 10);

await actor.unlockTreeNode("normal", "b2a");
await actor.resetTree();
console.log("reset removes all stored results:", Object.keys(actor.system.treeRolls).length === 0);
console.log("reset reverses current and maximum PV:", actor.system.hp.value === 10 && actor.system.hp.max === 10);
