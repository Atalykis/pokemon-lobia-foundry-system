/** Exercise prepareDerivedData directly: stats -> base, tree -> bonus, field -> mod. */
const fields = {};
for (const n of ["NumberField","StringField","HTMLField","ObjectField","ArrayField","BooleanField","SchemaField","SetField"]) {
  fields[n] = class { constructor(o = {}) { this.options = o; } };
}
globalThis.foundry = {
  abstract: { TypeDataModel: class { static migrateData(source) { return source; } } },
  data: { fields }
};
globalThis.CONFIG = {};
const SYS = "/home/atalykis/.local/share/foundryvtt/Data/systems/lobia";
const { default: Base } = await import(`${SYS}/module/data/actor-base.mjs`);

// Minimal stand-in: the real DataModel would build these from the schema.
class FakeTrainer extends Base {
  constructor(data) {
    super();
    Object.assign(this, data);
  }
}

const stat = (base, mod = 0) => ({ base, mod });
const actor = new FakeTrainer({
  hp: { value: 10, base: 10 },
  stats: {
    attaque: stat(65), attaqueSpeciale: stat(35), defense: stat(55, 20),
    defenseSpeciale: stat(35), vitesse: stat(35)
  },
  derivedMods: { armure: 3, barriere: 0, initiative: -1, physique: 0, special: 0 },
  battle: { action: { value: 1, max: 1 } }
});
actor.prepareDerivedData();

console.log("defense: base 55 + mod 20 = total", actor.stats.defense.total);
const d = actor.derived;
const row = (k) => `${k.padEnd(11)} base ${String(d[k].base).padStart(2)}  bonus ${String(d[k].bonus).padStart(2)}  mod ${String(d[k].mod).padStart(2)}  total ${d[k].total}`;
for (const k of Base.DERIVED_KEYS) console.log(row(k));

console.log("\nchecks:");
console.log("  armure base = trunc(75/10) = 7 :", d.armure.base === 7);
console.log("  armure total = 7 + 0 + 3 = 10  :", d.armure.total === 10);
console.log("  initiative base = trunc(35/10)*2 = 6 :", d.initiative.base === 6);
console.log("  initiative total = 6 + 0 - 1 = 5     :", d.initiative.total === 5);

// Now simulate the Trainer subclass folding in an Armure + tree bonus.
for (const k of Base.DERIVED_KEYS) {
  const v = actor.derived[k];
  v.bonus += (k === "armure" ? 1 : 0);
  v.total = v.base + v.bonus + v.mod;
}
console.log("  armure with +1 tree bonus = 7+1+3 = 11 :", actor.derived.armure.total === 11);
console.log("  a zero mod leaves total = base+bonus    :", actor.derived.physique.total === actor.derived.physique.base);

// Exercise the real Trainer classifier: strong modifiers grant +2; defensive and
// action-economy modifiers grant +1.
const { default: Trainer } = await import(`${SYS}/module/data/actor-trainer.mjs`);
class FakeRealTrainer extends Trainer {
  constructor(data) {
    super();
    Object.assign(this, data);
  }
}
const makeTrainer = (types, trees) => new FakeRealTrainer({
  hp: { value: 10, base: 10 },
  stats: {
    attaque: stat(65), attaqueSpeciale: stat(35), defense: stat(55),
    defenseSpeciale: stat(35), vitesse: stat(35)
  },
  derivedMods: { armure: 0, barriere: 0, initiative: 0, physique: 0, special: 0 },
  battle: {
    deplacement: { value: 1, max: 1 }, action: { value: 1, max: 1 },
    actionBonus: { value: 1, max: 1 }, reaction: { value: 1, max: 1 }
  },
  type: { secondary: types[0], third: types[1], fourth: types[2] },
  trees
});

const defensive = makeTrainer(["acier", "fee", "combat"], {
  acier: { b2a: true, b6a: true },
  fee: { b2a: true, b6a: true },
  combat: { b2a: true, b6a: true },
  normal: { b6a: true, term: true }
});
defensive.prepareDerivedData();
console.log("  Armure + grants +1                    :", defensive.derived.armure.bonus === 1);
console.log("  Barrière + grants +1                  :", defensive.derived.barriere.bonus === 1);
console.log("  Physique + grants +2                  :", defensive.derived.physique.bonus === 2);
console.log("  Réaction + grants +1                  :", defensive.battle.reaction.bonus === 2);
console.log("  Action Bonus + grants +1              :", defensive.battle.actionBonus.bonus === 2);
console.log("  terminal Action + grants +1           :", defensive.battle.action.bonus === 1);

const offensive = makeTrainer(["eau", "electrik", "dragon"], {
  eau: { b2a: true }, electrik: { b2a: true }, dragon: { b6a: true }
});
offensive.prepareDerivedData();
console.log("  Spécial + grants +2                   :", offensive.derived.special.bonus === 2);
console.log("  Initiative + grants +2                :", offensive.derived.initiative.bonus === 2);
console.log("  Déplacement + remains +1              :", offensive.battle.deplacement.bonus === 1);

const migratedHp = Base.migrateData({ hp: { value: 16, max: 16 }, treeRolls: { "normal-b2a": 6 } });
console.log("  legacy HP keeps total without double bonus:", migratedHp.hp.base === 10 && !("max" in migratedHp.hp));
const migratedSkills = Trainer.migrateData({ skills: { "acier-C": 2, "acier-machine": 1 } });
console.log("  legacy skill key migrates and keeps highest tier:",
  migratedSkills.skills["acier-machine"] === 2 && !("acier-C" in migratedSkills.skills));
