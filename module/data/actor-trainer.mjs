import LobiaActorBase from "./actor-base.mjs";
import { LOBIA } from "../config.mjs";
import { TREE_NODES, TREE_NODES_BY_ID } from "./tree-template.mjs";
import { getTreeLabels } from "./skill-registry.mjs";
import { LEGACY_SKILL_KEYS } from "./skill-key-migrations.mjs";

/**
 * Trainer actor: the five shared battle stats plus four trainer-only stats,
 * an identity block (name/level/age/…), and typing (always Normal + a chosen second type).
 */
export default class LobiaTrainer extends LobiaActorBase {

  /** @override */
  static defineStats() {
    const stat = (initial) => this.statField(initial);
    return {
      ...super.defineStats(),
      charisme: stat(50),
      discretion: stat(50),
      talent: stat(50),
      connaissance: stat(50)
    };
  }

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    // Money, in Pokédollars (₽).
    schema.money = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 });
    schema.levelDice = new fields.StringField({ required: true, blank: false, initial: "2D4" });

    schema.identity = new fields.SchemaField({
      prenom: new fields.StringField({ required: true, blank: true, initial: "" }),
      nom: new fields.StringField({ required: true, blank: true, initial: "" }),
      niveau: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 20 }),
      age: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      taille: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      poids: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      sexe: new fields.StringField({ required: true, blank: true, initial: "" }),
      attirance: new fields.StringField({ required: true, blank: true, initial: "" }),
      metier: new fields.StringField({ required: true, blank: true, initial: "" })
    });

    // A Trainer has 4 skill-tree branches: Normal is always the first (LOBIA.trainerBaseType),
    // the other three are chosen (secondary/third/fourth).
    const typeChoice = () => new fields.StringField({
      required: true, blank: true, initial: "", choices: Object.keys(LOBIA.types)
    });
    schema.type = new fields.SchemaField({
      secondary: typeChoice(),
      third: typeChoice(),
      fourth: typeChoice()
    });

    // Inventory is made of embedded Items (bucketed by system.category); this is just
    // the free-text corner of the "Autres" panel for anything that is not an object.
    schema.inventory = new fields.SchemaField({
      autres: new fields.StringField({ required: true, blank: true, initial: "" })
    });

    // Per-skill progression: map of stable skill key -> unlocked tier (1, 2, or 3/MAX).
    schema.skills = new fields.ObjectField({ required: false, initial: {} });

    // Unlocked tree cells: { "<branchType>": { "<nodeId>": true } }.
    schema.trees = new fields.ObjectField({ required: false, initial: {} });

    // One-time dice results granted by tree nodes, keyed as "<branchType>-<nodeId>".
    schema.treeRolls = new fields.ObjectField({ required: false, initial: {} });

    return schema;
  }

  /** @override */
  static migrateData(source) {
    const skills = source?.skills;
    if (skills && typeof skills === "object") {
      for (const [oldKey, newKey] of Object.entries(LEGACY_SKILL_KEYS)) {
        if (!(oldKey in skills)) continue;
        skills[newKey] = Math.max(skills[newKey] ?? 0, skills[oldKey] ?? 0);
        delete skills[oldKey];
      }
    }
    return super.migrateData(source);
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const b = this.#collectTreeBonuses();

    this.hp.bonus = Object.values(this.treeRolls ?? {}).reduce(
      (sum, value) => sum + (Number(value) || 0), 0
    );
    this.hp.max = this.hp.base + this.hp.bonus;

    // Numeric self-buffs from unlocked tree nodes land in the automatic `bonus` part,
    // leaving `mod` for whatever the GM or player types in by hand.
    for (const key of this.constructor.DERIVED_KEYS) {
      const d = this.derived[key];
      d.bonus += b[key] ?? 0;
      d.total = d.base + d.bonus + d.mod;
    }

    // Action-economy buffs -> effective battle totals (base max is left editable, untouched).
    for (const [res, n] of Object.entries(b.battle)) {
      if (!this.battle[res]) continue;
      this.battle[res].bonus = n;
      this.battle[res].total = this.battle[res].max + n;
    }
  }

  /** Sum the passive bonuses granted by unlocked tree cells across all branches. */
  #collectTreeBonuses() {
    const acc = {
      armure: 0, barriere: 0, physique: 0, special: 0, initiative: 0,
      battle: { deplacement: 0, action: 0, actionBonus: 0, reaction: 0 }
    };
    for (const branch of this.branches) {
      const unlocked = this.trees?.[branch] ?? {};
      for (const [nodeId, on] of Object.entries(unlocked)) {
        if (!on) continue;
        const node = TREE_NODES_BY_ID[nodeId];
        if (!node) continue;
        let label = null;
        if (node.kind === "terminal") label = "Action +";
        else if (node.kind === "bonus") label = getTreeLabels(branch)[node.labelSlot] ?? "";
        if (!label) continue;
        this.#applyBonusLabel(acc, label);
      }
    }
    return acc;
  }

  /** Classify a bonus label and accumulate its numeric effect. */
  #applyBonusLabel(acc, label) {
    const l = label.toLowerCase();
    if (l.startsWith("armure")) acc.armure++;
    else if (l.startsWith("barri")) acc.barriere++;
    else if (l.startsWith("physique")) acc.physique += 2;
    else if (l.startsWith("sp")) acc.special += 2;       // Spécial
    else if (l.startsWith("initiative")) acc.initiative += 2;
    else if (l.startsWith("action bonus")) acc.battle.actionBonus++;
    else if (l.startsWith("action")) acc.battle.action++;
    else if (l.startsWith("r")) acc.battle.reaction++;   // Réaction
    else if (l.startsWith("d") && l.includes("placement")) acc.battle.deplacement++;
    // "PV +" is rolled and banked when unlocked. Other labels are narrative.
  }

  /* -------------------------------------------- */
  /*  Skill-tree computed helpers                 */
  /* -------------------------------------------- */

  /** The trainer's 4 branches (Normal always first, then the chosen types), de-duplicated. */
  get branches() {
    const list = [LOBIA.trainerBaseType, this.type.secondary, this.type.third, this.type.fourth];
    return list.filter((t, i) => t && list.indexOf(t) === i);
  }

  /** Total skill points available = trainer level. */
  get skillPointsTotal() { return (this.identity.niveau ?? 0) + this.acceleratorBonuses.points; }

  /** Only visible branches spend points; changing types keeps old progression dormant. */
  get skillPointsSpent() {
    let n = 0;
    for (const branch of this.branches) {
      for (const [nodeId, on] of Object.entries(this.trees?.[branch] ?? {})) {
        if (on === true && (TREE_NODES_BY_ID[nodeId]?.cost ?? 0) > 0) n++;
      }
    }
    return n;
  }

  get skillPointsRemaining() {
    return this.skillPointsTotal - this.skillPointsSpent;
  }

  /** Is a given tree cell unlocked? The root is always unlocked (free). */
  isNodeUnlocked(branch, nodeId) {
    if (TREE_NODES_BY_ID[nodeId]?.kind === "root") return true;
    return this.trees?.[branch]?.[nodeId] === true;
  }

  /** Prerequisite satisfied? True if the node has a root parent or ≥1 unlocked parent. */
  isNodePrereqMet(branch, nodeId) {
    const node = TREE_NODES_BY_ID[nodeId];
    if (!node || node.kind === "root") return true;
    return node.parents.some(p => this.isNodeUnlocked(branch, p));
  }

  /** Can this cell be unlocked right now? (not already, prereq met, points remaining). */
  isNodeAvailable(branch, nodeId) {
    return !this.isNodeUnlocked(branch, nodeId)
      && this.isNodePrereqMet(branch, nodeId)
      && this.skillPointsRemaining > 0;
  }

  /* -------------------------------------------- */
  /*  Skill "steps" (granted by Compétence Dresseur cells)  */
  /* -------------------------------------------- */

  /** Number of unlocked Compétence Dresseur cells in the active branches. */
  get competenceSlots() {
    let n = 0;
    for (const branch of this.branches) {
      for (const [nodeId, on] of Object.entries(this.trees?.[branch] ?? {})) {
        if (on === true && TREE_NODES_BY_ID[nodeId]?.kind === "competence") n++;
      }
    }
    return n;
  }

  /** Total skill tiers currently allocated (sum of owned skill levels). */
  get skillStepsSpent() {
    return Object.values(this.skills ?? {}).reduce((a, t) => a + (Number(t) || 0), 0);
  }

  /** Skill steps still available to learn or level up a skill. */
  get skillStepsRemaining() {
    return this.competenceSlots - this.skillStepsSpent;
  }
}
