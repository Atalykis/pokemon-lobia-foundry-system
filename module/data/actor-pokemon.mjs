import LobiaActorBase from "./actor-base.mjs";
import { LOBIA } from "../config.mjs";
import { getNature } from "./nature-registry.mjs";
import { legacyTalentKey } from "./talent-registry.mjs";
import { pokemonHpDice } from "./pokemon-hp.mjs";
import { pokemonTreeProfile, pokemonNodeOpen, POKEMON_TREE_NODES, pokemonTreeBonus } from "./pokemon-tree.mjs";
import { getDominantTree } from "./dominant-tree-registry.mjs";
import { pokemonSpecies } from "./pokemon-species.mjs";
import { DIVISION_SLOTS, divisionBranchId, selectedDivisionRoles } from "./pokemon-division.mjs";

/**
 * Pokémon actor: five battle stats, one or two elemental types and identity.
 * Species averages and talent catalogues are placeholders until source data arrives.
 */
export default class LobiaPokemon extends LobiaActorBase {

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    const fields = foundry.data.fields;
    const typeChoice = (initial, blank) => new fields.StringField({
      required: true, blank, initial, choices: Object.keys(LOBIA.types)
    });
    schema.type = new fields.SchemaField({
      primary: typeChoice("normal", false),
      secondary: typeChoice("", true)
    });
    const positive = (initial = 0) => new fields.NumberField({
      required: true, nullable: false, initial, min: 0
    });
    const text = () => new fields.StringField({ required: true, blank: true, initial: "" });
    schema.identity = new fields.SchemaField({
      nickname: text(),
      level: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 20 }),
      sex: new fields.StringField({ required: true, blank: true, initial: "", choices: ["male", "female", "none"] }),
      averageSize: positive(),   // cm; placeholder until species data is available
      averageWeight: positive(), // kg
      size: positive(),
      weight: positive(),
      sizeRoll: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 100 }),
      shinyRoll: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 100 }),
      nature: new fields.StringField({ required: true, blank: true, initial: "" }),
      natureRolled: new fields.BooleanField({ initial: false }),
      shiny: new fields.BooleanField({ initial: false }),
      dominant: new fields.BooleanField({ initial: false })
    });
    schema.species = new fields.SchemaField({
      name: text(),
      evolution: text(),
      hpFormula: text(),
      evolutionHp: text(),
      malePercent: positive(),
      femalePercent: positive()
    });
    // These slots reference stable keys in the GM-owned Talent catalogue.
    schema.talents = new fields.SchemaField({
      first: text(),
      second: text(),
      third: text(),
      selected: new fields.StringField({ required: true, blank: true, initial: "", choices: ["first", "second", "third"] })
    });
    schema.pokemonTrees = new fields.ObjectField({ required: false, initial: {} });
    // Five members of a Divighost division; repeated roles are permitted.
    schema.divisionMembers = new fields.ObjectField({ required: false, initial: {} });
    // One freely selected CT move per regular tree, up to four (Dominant excluded).
    schema.ctMoves = new fields.ObjectField({ required: false, initial: {} });
    schema.dominantType = new fields.StringField({ required: true, blank: true, initial: "",
      choices: ["", ...Object.keys(LOBIA.types)] });
    // GM-authored branches belong to this actor, independently of the bundled Pokédex.
    schema.customPokemonBranches = new fields.ObjectField({ required: false, initial: {} });
    // One stored die result per unlocked PV + cell, independent of Trainer treeRolls.
    schema.pokemonTreeRolls = new fields.ObjectField({ required: false, initial: {} });
    // Permanent result for each PV + cell; locking/resetting only removes its active bonus.
    schema.pokemonTreeHpHistory = new fields.ObjectField({ required: false, initial: {} });
    return schema;
  }

  /** Promote legacy talent names and previously free tree roots. */
  static migrateData(source) {
    if (source?.species?.hpFormula) {
      const formula = String(source.species.hpFormula).trim();
      source.species.hpFormula = pokemonHpDice(formula) ?? (/^\d+$/.test(formula) ? "" : formula);
    }
    if (source?.identity?.nature && !source.identity.natureRolled) source.identity.natureRolled = true;
    if (source?.talents) delete source.talents.hidden;
    for (const slot of ["first", "second", "third"]) {
      if (source?.talents?.[slot]) source.talents[slot] = legacyTalentKey(source.talents[slot]);
    }
    for (const branch of Object.values(source?.pokemonTrees ?? {})) {
      if (branch && Object.entries(branch).some(([id, unlocked]) => id !== "root" && unlocked)) {
        branch.root = true;
      }
    }
    if (source?.pokemonTreeRolls) {
      source.pokemonTreeHpHistory ??= {};
      for (const [key, value] of Object.entries(source.pokemonTreeRolls)) {
        if (!Object.hasOwn(source.pokemonTreeHpHistory, key) && Number.isInteger(value) && value > 0) {
          source.pokemonTreeHpHistory[key] = value;
        }
      }
    }
    return super.migrateData(source);
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.hp.bonus = Object.values(this.pokemonTreeRolls ?? {}).reduce(
      (sum, value) => sum + (Number(value) || 0), 0);
    this.hp.max = this.hp.base + this.hp.bonus;
    const effects = getNature(this.identity.nature)?.effects ?? {};
    const division = pokemonSpecies(this.species?.name || this.parent?.name)?.division;
    const divisionBonuses = {};
    if (division) for (const roleId of selectedDivisionRoles(division, this.divisionMembers)) {
      for (const [key, bonus] of Object.entries(division.roles[roleId]?.stats ?? {})) {
        divisionBonuses[key] = (divisionBonuses[key] ?? 0) + bonus;
      }
    }
    // Divighost's evolution comment grants +5 to every stat at levels 5 and 10.
    const levelBonus = division ? (this.identity.level >= 5 ? 5 : 0)
      + (this.identity.level >= 10 ? 5 : 0) : 0;
    for (const [key, stat] of Object.entries(this.stats)) {
      stat.natureBonus = effects[key] ?? 0;
      stat.divisionBonus = (divisionBonuses[key] ?? 0) + levelBonus;
      stat.total += stat.natureBonus + stat.divisionBonus;
    }
    // Derived modifiers use effective stats, including Nature.
    const derivedFrom = {
      armure: Math.trunc(this.stats.defense.total / 10),
      barriere: Math.trunc(this.stats.defenseSpeciale.total / 10),
      initiative: Math.trunc(this.stats.vitesse.total / 10) * 2,
      physique: Math.trunc(this.stats.attaque.total / 10),
      special: Math.trunc(this.stats.attaqueSpeciale.total / 10)
    };
    for (const [key, base] of Object.entries(derivedFrom)) {
      this.derived[key].base = base;
      this.derived[key].total = base + this.derived[key].bonus + this.derived[key].mod;
    }
    for (const branch of this.treeProfile.branches) {
      for (const [nodeId, on] of Object.entries(this.pokemonTrees?.[branch.id] ?? {})) {
        if (!on || !POKEMON_TREE_NODES[nodeId]
          || !pokemonNodeOpen(this.treeProfile, branch, nodeId, this.identity.level)) continue;
        const bonus = pokemonTreeBonus(branch.labels[nodeId]);
        if (bonus?.derived) {
          const value = this.derived[bonus.derived];
          value.bonus += bonus.amount;
          value.total += bonus.amount;
        }
        if (bonus?.battle) {
          const value = this.battle[bonus.battle];
          value.bonus += bonus.amount;
          value.total += bonus.amount;
        }
      }
    }
  }

  get treeProfile() {
    const speciesName = this.species?.name || this.parent?.name;
    const profile = pokemonTreeProfile(speciesName);
    const type = this.dominantTreeType;
    const tree = getDominantTree(type);
    const dominant = tree ? [{ id: `dominant-${type}`, species: speciesName || "Pokémon",
      dominant: true, type, ...tree }] : [];
    const custom = Object.entries(this.customPokemonBranches ?? {})
      .filter(([id]) => /^custom-[a-zA-Z0-9]+$/.test(id))
      .map(([id, branch]) => ({
         id, custom: true, species: speciesName || "Pokémon",
         title: branch?.title ?? "",
         conditionType: branch?.conditionType ?? "",
         conditionLevel: branch?.conditionLevel ?? 1,
         conditionSpecies: branch?.conditionSpecies ?? "",
         labels: Object.fromEntries(Object.keys(POKEMON_TREE_NODES)
          .map(node => [node, branch?.labels?.[node] ?? ""]))
      }));
    const division = pokemonSpecies(speciesName)?.division;
    const branches = division && !this.parent?.pack
      ? DIVISION_SLOTS.flatMap(slot => {
        const role = this.divisionMembers?.[slot];
        const branch = profile.branches.find(entry => entry.divisionRole === role);
        return branch ? [{ ...branch, id: divisionBranchId(slot), divisionSlot: slot }] : [];
      }) : profile.branches;
    return { ...profile, name: profile.name || speciesName,
      selectedDivisionRoles: selectedDivisionRoles(division, this.divisionMembers), branches: [
       ...(profile.name ? branches : custom.length ? [] : branches), ...dominant, ...custom
    ] };
  }

  get ctBranches() { return this.treeProfile.branches.filter(branch => !branch.dominant).slice(0, 4); }

  get dominantTypes() {
    return [...new Set([this.type?.primary, this.type?.secondary]
      .filter(type => type && getDominantTree(type)))];
  }

  get dominantTreeType() {
    if (!this.identity?.dominant) return null;
    const types = this.dominantTypes;
    return types.length === 1 ? types[0] : types.includes(this.dominantType) ? this.dominantType : null;
  }

  get pokemonTreePointsTotal() { return (this.identity.level ?? 0) + this.acceleratorBonuses.points; }

  get pokemonTreePointsSpent() {
    return Object.values(this.pokemonTrees ?? {}).reduce((total, branch) => total +
      Object.entries(branch ?? {}).filter(([id, on]) => on && POKEMON_TREE_NODES[id]?.cost).length, 0);
  }

  get pokemonTreePointsRemaining() { return this.pokemonTreePointsTotal - this.pokemonTreePointsSpent; }

  isPokemonNodeAvailable(branchId, nodeId) {
    const branch = this.treeProfile.branches.find(entry => entry.id === branchId);
    const node = POKEMON_TREE_NODES[nodeId];
    const otherDominantInvestment = branch?.dominant && Object.entries(this.pokemonTrees ?? {})
      .some(([id, nodes]) => id.startsWith("dominant-") && id !== branchId
        && Object.values(nodes ?? {}).some(Boolean));
    if (!branch || !branch.species || !branch.labels[nodeId]?.trim() || !node
      || otherDominantInvestment
      || !pokemonNodeOpen(this.treeProfile, branch, nodeId, this.identity.level)
      || this.pokemonTrees?.[branchId]?.[nodeId] || this.pokemonTreePointsRemaining <= 0) return false;
    return nodeId === "root" || node.parents.some(parent => this.pokemonTrees?.[branchId]?.[parent]);
  }
}
