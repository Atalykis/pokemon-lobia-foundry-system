import assert from "node:assert/strict";

const fields = {};
for (const name of ["NumberField", "StringField", "HTMLField", "ObjectField", "SchemaField"]) {
  fields[name] = class {};
}
globalThis.foundry = {
  abstract: { TypeDataModel: class {} }, data: { fields }
};
const { default: Trainer } = await import("../../module/data/actor-trainer.mjs");
class TestTrainer extends Trainer {
  constructor(trees, type = { secondary: "poison", third: "", fourth: "" }) {
    super();
    this.identity = { niveau: 1 };
    this.type = type;
    this.trees = trees;
  }
}

const klaus = new TestTrainer({
  sol: { cd1: true, b2a: true, cd2: true }, roche: { cd1: true }, vol: {}
});
assert.deepEqual(klaus.branches, ["normal", "poison"]);
assert.equal(klaus.skillPointsSpent, 0);
assert.equal(klaus.skillPointsRemaining, 1);
assert.equal(klaus.competenceSlots, 0);
assert.equal(klaus.isNodeAvailable("poison", "cd1"), true);

klaus.trees.poison = { cd1: true };
assert.equal(klaus.skillPointsSpent, 1);
assert.equal(klaus.skillPointsRemaining, 0);
assert.equal(klaus.competenceSlots, 1);
klaus.type.secondary = "sol";
assert.equal(klaus.skillPointsSpent, 3);
assert.equal(klaus.competenceSlots, 2);
assert.equal(new TestTrainer({}).skillPointsSpent, 0);
console.log("Trainer points count only visible branches: PASS");
