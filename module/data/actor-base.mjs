/**
 * Shared data model for all Lobia actors (Pokémon + Trainer).
 * Holds the battle stats, an HP resource, and computes derived values.
 */
import { COMBAT_STYLES, combatStyleEffects } from "./combat-styles.mjs";
import { ACCELERATORS } from "./accelerators.mjs";

export default class LobiaActorBase extends foundry.abstract.TypeDataModel {

  /** The derived values every actor has ("Modificateur" on the sheet). */
  static DERIVED_KEYS = ["armure", "barriere", "initiative", "physique", "special"];

  /**
   * A single stat: an editable `base` score plus an editable `mod`.
   * `total` (= base + mod) is computed in prepareDerivedData and is never stored.
   * @param {number} initial  Default base score.
   * @returns {foundry.data.fields.SchemaField}
   */
  static statField(initial) {
    const fields = foundry.data.fields;
    return new fields.SchemaField({
      base: new fields.NumberField({
        required: true, nullable: false, integer: true, initial, min: 0, max: 100
      }),
      // Unbounded on purpose: a typo should not raise a validation error.
      // The roll target is clamped to 0-100 when the check is actually made.
      mod: new fields.NumberField({
        required: true, nullable: false, integer: true, initial: 0
      })
    });
  }

  /**
   * The battle stats every actor has, as a map of key -> field.
   * Subclasses (Trainer) override this to add extra stats.
   * @returns {Record<string, foundry.data.fields.SchemaField>}
   */
  static defineStats() {
    const stat = (initial) => this.statField(initial);
    return {
      attaque: stat(65),
      attaqueSpeciale: stat(35),
      defense: stat(55),
      defenseSpeciale: stat(35),
      vitesse: stat(35)
    };
  }

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.hp = new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 }),
      base: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 10, min: 0 })
    });
    // Results already incorporated in hp.base; retained for the HP hover breakdown.
    schema.levelUpRolls = new fields.ObjectField({ required: false, initial: {} });
    // Consumed items are recorded here, independently of the inventory and manual modifiers.
    schema.accelerators = new fields.ObjectField({ required: false, initial: {} });

    // Battle resources (action economy). Spent during combat, refreshed each turn.
    // value = remaining this turn, max = per-turn allotment.
    const resource = (initial) => new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, integer: true, initial, min: 0 }),
      max: new fields.NumberField({ required: true, nullable: false, integer: true, initial, min: 0 })
    });
    schema.battle = new fields.SchemaField({
      deplacement: resource(1),
      action: resource(1),
      actionBonus: resource(1),
      reaction: resource(1)
    });

    schema.stats = new fields.SchemaField(this.defineStats());
    schema.combatStyle = new fields.StringField({
      required: true, blank: false, initial: "neutre", choices: Object.keys(COMBAT_STYLES)
    });

    // Manual modifiers on the derived values — usable objects, skills, anything the
    // system does not compute by itself.
    schema.derivedMods = new fields.SchemaField(Object.fromEntries(
      this.DERIVED_KEYS.map(key => [key, new fields.NumberField({
        required: true, nullable: false, integer: true, initial: 0
      })])
    ));

    schema.notes = new fields.HTMLField({ required: false, blank: true });

    return schema;
  }

  /**
   * Stats used to be plain numbers (`system.stats.attaque = 65`); they are now
   * `{base, mod}`. Promote any legacy scalar so existing actors keep their scores.
   * @override
   */
  static migrateData(source) {
    const hp = source?.hp;
    if (hp && typeof hp === "object" && hp.base === undefined && Number.isFinite(hp.max)) {
      const rolledBonus = [...Object.values(source.treeRolls ?? {}),
        ...Object.values(source.pokemonTreeRolls ?? {})]
        .reduce((sum, value) => sum + (Number(value) || 0), 0);
      hp.base = Math.max(0, hp.max - rolledBonus);
      delete hp.max;
    }

    const stats = source?.stats;
    if (stats && typeof stats === "object") {
      for (const [key, value] of Object.entries(stats)) {
        if (typeof value === "number") stats[key] = { base: value, mod: 0 };
      }
    }
    return super.migrateData(source);
  }

  /** @override */
  prepareDerivedData() {
    // Token bars consume value/max. Only the base is stored; subclasses add bonuses.
    this.hp.bonus = 0;
    this.hp.max = this.hp.base;

    // Automatic style bonuses last only while this stance is active; the stored score is unchanged.
    this.combatStyleEffects = combatStyleEffects(this.combatStyle);
    for (const [key, stat] of Object.entries(this.stats)) {
      stat.acceleratorBonus = this.acceleratorBonuses.stats[key] ?? 0;
      stat.styleBonus = this.combatStyleEffects.stats[key] ?? 0;
      stat.total = (stat.base ?? 0) + (stat.mod ?? 0) + stat.acceleratorBonus + stat.styleBonus;
    }

    // Derived values read the effective totals, so stat modifiers propagate.
    const s = this.stats;
    const t = Math.trunc;
    const computed = {
      armure: t(s.defense.total / 10),
      barriere: t(s.defenseSpeciale.total / 10),
      initiative: t(s.vitesse.total / 10) * 2,
      physique: t(s.attaque.total / 10),
      special: t(s.attaqueSpeciale.total / 10)
    };

    // base  = computed from the stats
    // bonus = granted automatically (the Trainer's unlocked tree nodes)
    // mod   = typed in by hand on the sheet
    this.derived = {};
    for (const key of this.constructor.DERIVED_KEYS) {
      const base = computed[key];
      const mod = this.derivedMods?.[key] ?? 0;
      const bonus = this.acceleratorBonuses.derived[key] ?? 0;
      this.derived[key] = { base, bonus, mod, total: base + bonus + mod };
    }

    // Effective battle allotment = editable base (max) + any bonus (subclasses add tree bonuses).
    for (const res of Object.values(this.battle)) {
      res.bonus = 0;
      res.total = res.max;
    }
  }

  get acceleratorCount() { return Object.keys(this.accelerators ?? {}).length; }

  get acceleratorBonuses() {
    const bonuses = { stats: {}, derived: {}, points: 0 };
    for (const entry of Object.values(this.accelerators ?? {})) {
      const effect = ACCELERATORS[entry?.name];
      if (effect?.stat) bonuses.stats[effect.stat] = (bonuses.stats[effect.stat] ?? 0) + effect.amount;
      if (effect?.derived) bonuses.derived[effect.derived] = (bonuses.derived[effect.derived] ?? 0) + effect.amount;
      if (effect?.point) bonuses.points++;
    }
    return bonuses;
  }
}
