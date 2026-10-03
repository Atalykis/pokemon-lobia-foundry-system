import { resolveOutcome } from "../dice/d100.mjs";
import { TREE_NODES, TREE_NODES_BY_ID } from "../data/tree-template.mjs";
import { getSkill, getTreeLabels } from "../data/skill-registry.mjs";
import { measurementsForRoll } from "../data/pokemon-natures.mjs";
import { natureForRoll } from "../data/nature-registry.mjs";
import { POKEMON_TREE_NODES, pokemonTreeLabel } from "../data/pokemon-tree.mjs";
import { pokemonSpecies } from "../data/pokemon-species.mjs";
import { DIVISION_SLOTS, divisionBranchId } from "../data/pokemon-division.mjs";
import { isPokemonHpBonus, pokemonHpDice } from "../data/pokemon-hp.mjs";
import { LOBIA_STATUSES_BY_KEY, statusName, statusRule } from "../data/statuses.mjs";
import { acceleratorEffect, ppMaxMoveKeys } from "../data/accelerators.mjs";
import { getPokemonMoves, pokemonMove } from "../data/pokemon-moves.mjs";

const treeRollKey = (branch, nodeId) => `${branch}-${nodeId}`;

function isHpBonusNode(branch, nodeId) {
  const node = TREE_NODES_BY_ID[nodeId];
  if (node?.kind !== "bonus") return false;
  return (getTreeLabels(branch)[node.labelSlot] ?? "").trim().toLowerCase().startsWith("pv");
}

/**
 * Extended Actor document providing the Lobia d100 roll mechanic.
 */
export default class LobiaActor extends Actor {

  #pokemonRollsInProgress = new Set();
  #pokemonTreeBusy = false;
  #levelUpBusy = false;
  #acceleratorBusy = false;
  #statusMutationsInProgress = new Set();

  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (this.type === "pokemon") {
      const species = String(data.system?.species?.name || data.name || this.name || "").trim();
      const nickname = String(data.system?.identity?.nickname || data.name || species).trim();
      this.updateSource({ "system.species.name": species, "system.identity.nickname": nickname,
        name: nickname || species });
    }
    return allowed;
  }

  /** Manually apply/change one status and let Foundry show its ActiveEffect on tokens. */
  async setLobiaStatus(key, level) {
    const status = LOBIA_STATUSES_BY_KEY.get(key);
    level = Number(level);
    if (!status || !Number.isInteger(level) || level < 1 || level > 4
      || !["trainer", "pokemon"].includes(this.type) || this.pack || this.#statusMutationsInProgress.has(key)) return;
    this.#statusMutationsInProgress.add(key);
    try {
      const data = {
        name: `${statusName(status)} — ${game.i18n.format("LOBIA.Status.level", { level })}`,
        img: status.img,
        description: statusRule(status, level),
        "flags.lobia.level": level,
        "flags.lobia.status": status.key
      };
      const effect = [...(this.effects ?? [])].find(entry =>
        entry.statuses?.size === 1 && entry.statuses.has(status.id));
      if (effect) return await effect.update({ ...data, disabled: false });
      return await this.createEmbeddedDocuments("ActiveEffect", [{
        name: data.name, img: data.img, description: data.description,
        statuses: [status.id], flags: { lobia: { level, status: status.key } }
      }]);
    } finally { this.#statusMutationsInProgress.delete(key); }
  }

  /** Remove only the matching one-status effect, leaving unrelated effects untouched. */
  async removeLobiaStatus(key) {
    const status = LOBIA_STATUSES_BY_KEY.get(key);
    if (!status || this.#statusMutationsInProgress.has(key)) return;
    this.#statusMutationsInProgress.add(key);
    try {
      const effect = [...(this.effects ?? [])].find(entry =>
        entry.statuses?.size === 1 && entry.statuses.has(status.id));
      if (effect) return await this.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
    } finally { this.#statusMutationsInProgress.delete(key); }
  }

  #pokemonHpNode(branchId, nodeId) {
    const profile = this.system.treeProfile;
    const branch = profile.branches.find(entry => entry.id === branchId);
    return branch && isPokemonHpBonus(pokemonTreeLabel(profile, branch, nodeId));
  }

  async #pokemonHpRoll() {
    const dice = pokemonHpDice(this.system.species?.hpFormula || pokemonSpecies(this.system.species?.name || this.name)?.hpFormula);
    if (!dice) {
      ui.notifications.warn(game.i18n.localize("LOBIA.PokemonTree.missingHpFormula"));
      return null;
    }
    return { dice, roll: await new Roll(dice).evaluate() };
  }

  async #announcePokemonHpRoll({ dice, roll }) {
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.format("LOBIA.PokemonTree.hpRoll", { name: this.name, dice })
    });
  }

  #savedPokemonHp(branch, nodeId) {
    const value = this.system.pokemonTreeHpHistory?.[treeRollKey(branch, nodeId)];
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  /** Players may only write rolled identity fields through their corresponding one-time roll. */
  async _preUpdate(changes, options, user) {
    const changed = this.type === "pokemon" ? foundry.utils.flattenObject(changes) : {};
    if (["trainer", "pokemon"].includes(this.type)) {
      const flattened = this.type === "pokemon" ? changed : foundry.utils.flattenObject(changes);
      const levelPath = this.type === "pokemon" ? "system.identity.level" : "system.identity.niveau";
      if (!user.isGM && Object.keys(flattened).some(path => path.startsWith("system.levelUpRolls"))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Level.gmOnly"));
        return false;
      }
      if (!user.isGM && (Object.hasOwn(flattened, "system.levelDice")
        || Object.hasOwn(flattened, "system.species.hpFormula"))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Level.gmOnlyFormula"));
        return false;
      }
      const templateMigration = this.type === "pokemon" && this.pack === "lobia.pokemons"
        && options.lobiaPokemonTemplateMigration && user.isGM && flattened[levelPath] === 0;
      const levelDown = user.isGM && options.lobiaLevelDown && !this.pack
        && flattened[levelPath] === (this.type === "pokemon"
          ? this.system.identity.level : this.system.identity.niveau) - 1;
      if (Object.hasOwn(flattened, levelPath)
        && (!user.isGM || (!options.lobiaLevelUp && !templateMigration && !levelDown))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Level.gmOnly"));
        return false;
      }
      if (!user.isGM && Object.keys(flattened).some(path => path.startsWith("system.accelerators.-="))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Level.gmOnly"));
        return false;
      }
    }
    if (this.type === "pokemon") {
      const division = pokemonSpecies(this.system.species?.name || this.name)?.division;
      const memberChanges = Object.entries(changed).filter(([path]) => path.startsWith("system.divisionMembers"));
      if (memberChanges.length) {
        if (!division || this.pack || memberChanges.some(([path, role]) =>
          !DIVISION_SLOTS.includes(path.slice("system.divisionMembers.".length))
          || role && !Object.hasOwn(division.roles, role))) {
          ui.notifications.warn(game.i18n.localize("LOBIA.Divighost.invalidRole"));
          return false;
        }
        const next = { ...this.system.divisionMembers };
        for (const [path, role] of memberChanges) next[path.slice("system.divisionMembers.".length)] = role;
        if (DIVISION_SLOTS.some(slot => next[slot] !== this.system.divisionMembers?.[slot]
          && Object.values(this.system.pokemonTrees?.[divisionBranchId(slot)] ?? {}).some(Boolean))) {
          ui.notifications.warn(game.i18n.localize("LOBIA.Divighost.lockTreeFirst"));
          return false;
        }
      }
      if (this.pack === "lobia.pokemons" && Object.keys(changed).some(path =>
        path === "system.accelerators" || path.startsWith("system.accelerators.")
          && !path.startsWith("system.accelerators.-="))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Accelerator.noTemplates"));
        return false;
      }
      const speciesName = String(changed["system.species.name"] ?? this.system.species?.name ?? this.name).trim();
      if (Object.hasOwn(changed, "system.species.name")) changes["system.species.name"] = speciesName;
      const previousSpecies = this.system.species?.name || this.name;
      const nickname = Object.hasOwn(changed, "system.identity.nickname")
        ? changed["system.identity.nickname"]
        : Object.hasOwn(changed, "name") ? changed.name
          : Object.hasOwn(changed, "system.species.name")
            && (this.system.identity.nickname || previousSpecies) === previousSpecies ? speciesName
              : this.system.identity.nickname || this.name;
      const displayName = String(nickname ?? "").trim() || speciesName;
      if (displayName && (Object.hasOwn(changed, "system.identity.nickname")
        || Object.hasOwn(changed, "system.species.name") || Object.hasOwn(changed, "name"))) {
        changes.name = displayName;
        changes["system.identity.nickname"] = displayName;
      }
      const investedDominant = Object.entries(this.system.pokemonTrees ?? {}).some(([id, nodes]) =>
        id.startsWith("dominant-") && Object.values(nodes ?? {}).some(Boolean));
      if (investedDominant && (changed["system.identity.dominant"] === false
        || (["system.type.primary", "system.type.secondary"].some(key => Object.hasOwn(changed, key))
          && ![changed["system.type.primary"] ?? this.system.type?.primary,
            changed["system.type.secondary"] ?? this.system.type?.secondary]
            .includes(this.system.dominantTreeType)))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.PokemonTree.invalidDominantType"));
        return false;
      }
      if (Object.hasOwn(changed, "system.dominantType")) {
        const choice = changed["system.dominantType"];
        const primary = changed["system.type.primary"] ?? this.system.type?.primary;
        const secondary = changed["system.type.secondary"] ?? this.system.type?.secondary;
        const dominant = changed["system.identity.dominant"] ?? this.system.identity?.dominant;
        if (choice && (!dominant || ![primary, secondary].includes(choice))
          || investedDominant && choice !== this.system.dominantType) {
          ui.notifications.warn(game.i18n.localize("LOBIA.PokemonTree.invalidDominantType"));
          return false;
        }
      }
      if (Object.hasOwn(changed, "system.species.hpFormula") && user.isGM) {
        const formula = String(changed["system.species.hpFormula"] ?? "").trim();
        const dice = pokemonHpDice(formula);
        if (formula && !dice) {
          ui.notifications.warn(game.i18n.localize("LOBIA.Level.invalidFormula"));
          return false;
        }
        changes["system.species.hpFormula"] = dice ?? "";
      }
      const selected = changed["system.talents.selected"];
      if (selected && !(changed[`system.talents.${selected}`] ?? this.system.talents?.[selected])) {
        if (user.isGM && Object.hasOwn(changed, `system.talents.${selected}`)) {
          changes["system.talents.selected"] = "";
        } else {
          ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.invalidTalent"));
          return false;
        }
      }
      if (!user.isGM && ["first", "second", "third"].some(slot =>
        `system.talents.${slot}` in changed)) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.gmOnlyTalents"));
        return false;
      }
      if (!user.isGM && Object.keys(changed).some(path => path.startsWith("system.customPokemonBranches"))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.PokemonTree.gmOnly"));
        return false;
      }
    }
    if (this.type === "trainer" && user.isGM && Object.hasOwn(foundry.utils.flattenObject(changes), "system.levelDice")) {
      const dice = pokemonHpDice(foundry.utils.flattenObject(changes)["system.levelDice"]);
      if (!dice) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Level.invalidFormula"));
        return false;
      }
      changes["system.levelDice"] = dice;
    }
    if (this.type === "pokemon" && options.lobiaPokemonRoll) {
      const identity = this.system.identity;
      const alreadyRolled = {
        nature: Boolean(identity.nature || identity.natureRolled),
        measurements: identity.sizeRoll > 0,
        shiny: identity.shinyRoll > 0
      };
      if (alreadyRolled[options.lobiaPokemonRoll]) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.alreadyRolled"));
        return false;
      }
    }
    if (this.type === "pokemon" && !user.isGM) {
      const protectedFields = new Set(["nature", "natureRolled", "size", "weight", "sizeRoll",
        "shiny", "shinyRoll", "dominant"]);
      const allowedRollFields = {
        nature: ["nature", "natureRolled"],
        measurements: ["size", "weight", "sizeRoll", "dominant"],
        shiny: ["shiny", "shinyRoll"]
      };
      const allowed = allowedRollFields[options.lobiaPokemonRoll] ?? [];
      if (Object.keys(changed).some(path => path.startsWith("system.identity.")
        && protectedFields.has(path.slice("system.identity.".length))
        && !allowed.includes(path.slice("system.identity.".length)))) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.gmOnlyIdentity"));
        return false;
      }
    }
    return super._preUpdate(changes, options, user);
  }

  /** GM-only, one-level-at-a-time advancement using this actor's HP dice. */
  async levelUp() {
    if (!["trainer", "pokemon"].includes(this.type) || !game.user.isGM || this.pack || this.#levelUpBusy) return;
    const levelPath = this.type === "pokemon" ? "system.identity.level" : "system.identity.niveau";
    const level = this.type === "pokemon" ? this.system.identity.level : this.system.identity.niveau;
    if (level >= 20) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Level.maximum"));
      return;
    }
    const dice = this.type === "pokemon"
      ? pokemonHpDice(this.system.species?.hpFormula || pokemonSpecies(this.system.species?.name || this.name)?.hpFormula)
      : pokemonHpDice(this.system.levelDice ?? "2D4");
    if (!dice) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Level.invalidFormula"));
      return;
    }
    this.#levelUpBusy = true;
    try {
      const roll = await new Roll(dice).evaluate();
      const result = await this.update({
        [levelPath]: level + 1,
        "system.hp.base": this.system.hp.base + roll.total,
        "system.hp.value": this.system.hp.value + roll.total,
        [`system.levelUpRolls.level-${level + 1}`]: roll.total
      }, { lobiaLevelUp: true });
      if (result) await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: game.i18n.format("LOBIA.Level.roll", { name: this.name, level: level + 1, hp: roll.total, dice })
      });
      return result;
    } finally { this.#levelUpBusy = false; }
  }

  /** Undo the most recent level gain and its recorded HP roll, when available. */
  async levelDown() {
    if (!["trainer", "pokemon"].includes(this.type) || !game.user.isGM || this.pack || this.#levelUpBusy) return;
    const pokemon = this.type === "pokemon";
    const level = pokemon ? this.system.identity.level : this.system.identity.niveau;
    if (level <= 0) return;
    this.#levelUpBusy = true;
    try {
      const key = `level-${level}`;
      const roll = Number(this.system.levelUpRolls?.[key]);
      const gain = Number.isFinite(roll) && roll > 0 ? roll : 0;
      return await this.update({
        [pokemon ? "system.identity.level" : "system.identity.niveau"]: level - 1,
        ...(gain ? { "system.hp.base": Math.max(0, this.system.hp.base - gain),
          "system.hp.value": Math.max(0, this.system.hp.value - gain) } : {}),
        ...(Object.hasOwn(this.system.levelUpRolls ?? {}, key)
          ? { [`system.levelUpRolls.-=${key}`]: null } : {})
      }, { lobiaLevelDown: true });
    } finally { this.#levelUpBusy = false; }
  }

  /** Remove one spent accelerator; automatic stat, tree point and move bonuses then recalculate. */
  async removeAccelerator(id) {
    if (!["trainer", "pokemon"].includes(this.type) || !game.user.isGM || this.pack || this.#acceleratorBusy
      || !Object.hasOwn(this.system.accelerators ?? {}, id)) return;
    this.#acceleratorBusy = true;
    try {
      const hp = Number(this.system.accelerators[id]?.hp) || 0;
      return await this.update({
        [`system.accelerators.-=${id}`]: null,
        ...(hp > 0 ? { "system.hp.base": Math.max(0, this.system.hp.base - hp),
          "system.hp.value": Math.max(0, this.system.hp.value - hp) } : {})
      });
    } finally { this.#acceleratorBusy = false; }
  }

  /** Delete an unused accelerator stack from inventory without changing applied bonuses. */
  async removeUnusedAccelerator(itemId) {
    if (!["trainer", "pokemon"].includes(this.type) || !game.user.isGM || this.pack) return;
    const item = this.items.get(itemId);
    if (!acceleratorEffect(item) || !(item.system.quantity > 0)) return;
    return item.delete();
  }

  /** Moves present in this Pokémon's evolution branches, regardless of position or prerequisites. */
  get availableAcceleratorMoves() {
    if (this.type !== "pokemon") return [];
    const moves = new Map();
    for (const branch of this.system.treeProfile.branches) {
      if (!branch.species) continue;
      for (const nodeId of Object.keys(POKEMON_TREE_NODES)) {
        const move = pokemonMove(pokemonTreeLabel(this.system.treeProfile, branch, nodeId));
        if (move) moves.set(move.key, move);
      }
    }
    const granted = ppMaxMoveKeys(this.system.accelerators);
    return [...moves.values()].filter(move => !granted.has(move.key));
  }

  /** Assign or clear a CT capacity on one of the four regular evolution trees. */
  async setCtMove(branchId, moveKey) {
    if (this.type !== "pokemon" || this.pack || !this.isOwner
      || !this.system.ctBranches.some(branch => branch.id === branchId)) return;
    if (moveKey && !getPokemonMoves().some(move => move.key === moveKey)) return;
    if ((this.system.ctMoves?.[branchId] ?? "") === moveKey) return;
    return this.update(moveKey
      ? { [`system.ctMoves.${branchId}`]: moveKey }
      : { [`system.ctMoves.-=${branchId}`]: null });
  }

  /** Consume one carried accelerator and permanently bank its effect (maximum five). */
  async useAccelerator(itemId, moveKey = null) {
    if (!["trainer", "pokemon"].includes(this.type) || this.pack || !this.isOwner || this.#acceleratorBusy) return;
    const item = this.items.get(itemId);
    const effect = acceleratorEffect(item);
    if (!effect || !(item.system.quantity > 0)) return;
    if (this.system.acceleratorCount >= 5) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Accelerator.limit"));
      return;
    }
    if (effect.move && (this.type !== "pokemon" || !this.availableAcceleratorMoves.some(move => move.key === moveKey))) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Accelerator.chooseMove"));
      return;
    }
    const dice = effect.hp && (this.type === "pokemon"
      ? pokemonHpDice(this.system.species?.hpFormula || pokemonSpecies(this.system.species?.name || this.name)?.hpFormula)
      : pokemonHpDice(this.system.levelDice ?? "2D4"));
    if (effect.hp && !dice) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Level.invalidFormula"));
      return;
    }
    this.#acceleratorBusy = true;
    try {
      const roll = dice ? await new Roll(dice).evaluate() : null;
      const entry = { name: item.name, ...(moveKey ? { moveKey } : {}),
        ...(roll ? { hp: roll.total } : {}) };
      const updates = { [`system.accelerators.${foundry.utils.randomID()}`]: entry };
      if (roll) {
        updates["system.hp.base"] = this.system.hp.base + roll.total;
        updates["system.hp.value"] = this.system.hp.value + roll.total;
      }
      // Reduce the stack before granting the effect; restore it if the Actor update fails.
      const quantity = item.system.quantity;
      if (!await item.update({ "system.quantity": quantity - 1 })) return;
      try {
        const result = await this.update(updates);
        if (!result) { await item.update({ "system.quantity": quantity }); return; }
        if (roll) await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this }),
          flavor: game.i18n.format("LOBIA.Accelerator.hpRoll", { name: this.name, dice, hp: roll.total }) });
        return result;
      } catch (error) {
        await item.update({ "system.quantity": quantity });
        throw error;
      }
    } finally { this.#acceleratorBusy = false; }
  }

  /**
   * Roll a d100 check against one of this actor's stats (roll-under).
   * @param {string} statKey            The stat key, e.g. "attaque".
   * @param {object} [options]
   * @param {number} [options.modifier] A flat situational modifier added to the target value.
   * @returns {Promise<Roll>}
   */
  async rollStat(statKey, { modifier = 0 } = {}) {
    const stat = this.system.stats?.[statKey];
    if (!stat) {
      ui.notifications.warn(`Lobia | Unknown stat "${statKey}"`);
      return null;
    }

    // The threshold is the stat's effective score (base + modifier), plus any situational modifier.
    const score = stat.total ?? ((stat.base ?? 0) + (stat.mod ?? 0) + (stat.natureBonus ?? 0) + (stat.styleBonus ?? 0));
    const target = Math.clamp(score + modifier, 0, 100);
    const label = game.i18n.localize(`LOBIA.Stat.${statKey}`);

    const signed = (n) => `${n > 0 ? "+" : "−"}${Math.abs(n)}`;
    const parts = [`${stat.base ?? 0}`];
    if (stat.mod) parts.push(signed(stat.mod));
    if (stat.natureBonus) parts.push(signed(stat.natureBonus));
    if (stat.styleBonus) parts.push(signed(stat.styleBonus));
    if (stat.acceleratorBonus) parts.push(signed(stat.acceleratorBonus));
    if (modifier) parts.push(signed(modifier));
    const breakdown = parts.length > 1 ? ` <em>(${parts.join(" ")})</em>` : "";
    const style = this.system.combatStyle ?? "neutre";
    const styleHtml = style === "neutre" ? "" : `<div class="lobia-roll-style">${foundry.utils.escapeHTML(
      game.i18n.localize(`LOBIA.CombatStyle.${style}`))}: ${foundry.utils.escapeHTML(
      game.i18n.localize(`LOBIA.CombatStyle.${style}Hint`))}</div>`;

    const roll = await new Roll("1d100").evaluate();
    const outcome = resolveOutcome(roll.total, target);

    const rollHtml = await roll.render();
    const content = `
      <div class="lobia-roll outcome-${outcome}">
        <div class="lobia-roll-header">
          <span class="lobia-roll-stat">${label}</span>
          <span class="lobia-roll-target">${game.i18n.localize("LOBIA.Target")} ${target}${breakdown}</span>
        </div>
        ${rollHtml}
        <div class="lobia-roll-outcome">${game.i18n.localize(`LOBIA.Outcome.${outcome}`)}</div>
        ${styleHtml}
      </div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flavor: game.i18n.localize("LOBIA.RollFlavor")
    });

    return roll;
  }

  /** Roll Nature once and persist the result as a named nature. */
  async rollPokemonNature() {
    if (this.type !== "pokemon") return null;
    if (this.system.identity.nature || this.system.identity.natureRolled || this.#pokemonRollsInProgress.has("nature")) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.alreadyRolled"));
      return null;
    }
    this.#pokemonRollsInProgress.add("nature");
    try {
      const roll = await new Roll("1d100").evaluate();
      const nature = natureForRoll(roll.total);
      if (!nature) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Nature.noRollMatch"));
        return null;
      }
      await this.update({ "system.identity.nature": nature.key, "system.identity.natureRolled": true },
        { lobiaPokemonRoll: "nature" });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: game.i18n.format("LOBIA.Pokemon.natureRoll", {
          name: this.name, nature: nature.name
        })
      });
      return roll;
    } finally { this.#pokemonRollsInProgress.delete("nature"); }
  }

  /** One die determines both measurements and Dominant status (only 100). */
  async rollPokemonMeasurements() {
    if (this.type !== "pokemon") return null;
    if (this.system.identity.sizeRoll > 0 || this.#pokemonRollsInProgress.has("measurements")) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.alreadyRolled"));
      return null;
    }
    const { averageSize, averageWeight } = this.system.identity;
    if (!(averageSize > 0) || !(averageWeight > 0)) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.missingAverages"));
      return null;
    }
    this.#pokemonRollsInProgress.add("measurements");
    try {
      const roll = await new Roll("1d100").evaluate();
      const { size, weight } = measurementsForRoll(roll.total, averageSize, averageWeight);
      await this.update({
        "system.identity.size": size,
        "system.identity.weight": weight,
        "system.identity.sizeRoll": roll.total,
        "system.identity.dominant": roll.total === 100
      }, { lobiaPokemonRoll: "measurements" });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: game.i18n.format("LOBIA.Pokemon.measurementsRoll", { name: this.name, size, weight })
          + (roll.total === 100 ? ` — ${game.i18n.localize("LOBIA.Pokemon.dominant")}` : "")
      });
      return roll;
    } finally { this.#pokemonRollsInProgress.delete("measurements"); }
  }

  /** Independent 1d100; only a natural 1 is Chromatique. */
  async rollPokemonShiny() {
    if (this.type !== "pokemon") return null;
    if (this.system.identity.shinyRoll > 0 || this.#pokemonRollsInProgress.has("shiny")) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Pokemon.alreadyRolled"));
      return null;
    }
    this.#pokemonRollsInProgress.add("shiny");
    try {
      const roll = await new Roll("1d100").evaluate();
      const shiny = roll.total === 1;
      await this.update({
        "system.identity.shiny": shiny,
        "system.identity.shinyRoll": roll.total
      }, { lobiaPokemonRoll: "shiny" });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: game.i18n.format("LOBIA.Pokemon.shinyRoll", {
          name: this.name,
          result: game.i18n.localize(shiny ? "LOBIA.Pokemon.shiny" : "LOBIA.Pokemon.notShiny")
        })
      });
      return roll;
    } finally { this.#pokemonRollsInProgress.delete("shiny"); }
  }

  /** Pokémon progression uses family branches, not the Trainer's type trees. */
  async unlockPokemonNode(branch, nodeId) {
    if (this.type !== "pokemon" || this.pack || this.#pokemonTreeBusy) return;
    if (!this.system.isPokemonNodeAvailable(branch, nodeId)) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Tree.cannotUnlock"));
      return;
    }
    this.#pokemonTreeBusy = true;
    try {
      const update = { [`system.pokemonTrees.${branch}.${nodeId}`]: true };
      const isHpNode = this.#pokemonHpNode(branch, nodeId);
      const savedHp = isHpNode ? this.#savedPokemonHp(branch, nodeId) : null;
      const hpRoll = isHpNode && savedHp === null ? await this.#pokemonHpRoll() : null;
      if (isHpNode && savedHp === null && !hpRoll) return;
      if (isHpNode) {
        const amount = savedHp ?? hpRoll.roll.total;
        const key = treeRollKey(branch, nodeId);
        update[`system.pokemonTreeRolls.${key}`] = amount;
        if (savedHp === null) update[`system.pokemonTreeHpHistory.${key}`] = amount;
        update["system.hp.value"] = (this.system.hp.value ?? 0) + amount;
      }
      const result = await this.update(update);
      if (hpRoll && result) await this.#announcePokemonHpRoll(hpRoll);
      return result;
    } finally { this.#pokemonTreeBusy = false; }
  }

  /** Roll an already-unlocked PV + cell from before automatic HP bonuses existed. */
  async rollPokemonHpBonus(branch, nodeId) {
    if (this.type !== "pokemon" || this.pack || this.#pokemonTreeBusy
      || !this.system.pokemonTrees?.[branch]?.[nodeId]
      || !this.#pokemonHpNode(branch, nodeId)
      || Object.hasOwn(this.system.pokemonTreeRolls ?? {}, treeRollKey(branch, nodeId))) return;
    this.#pokemonTreeBusy = true;
    try {
      const savedHp = this.#savedPokemonHp(branch, nodeId);
      const hpRoll = savedHp === null ? await this.#pokemonHpRoll() : null;
      if (savedHp === null && !hpRoll) return;
      const key = treeRollKey(branch, nodeId);
      const amount = savedHp ?? hpRoll.roll.total;
      const result = await this.update({
        [`system.pokemonTreeRolls.${key}`]: amount,
        ...(savedHp === null ? { [`system.pokemonTreeHpHistory.${key}`]: amount } : {}),
        "system.hp.value": (this.system.hp.value ?? 0) + amount
      });
      if (hpRoll && result) await this.#announcePokemonHpRoll(hpRoll);
      return result;
    } finally { this.#pokemonTreeBusy = false; }
  }

  /** Refund the cell and prune descendants that no longer have an unlocked parent. */
  async lockPokemonNode(branch, nodeId) {
    if (this.type !== "pokemon" || !POKEMON_TREE_NODES[nodeId] || this.#pokemonTreeBusy) return;
    if (!this.system.treeProfile.branches.some(entry => entry.id === branch)) return;
    const unlocked = { ...this.system.pokemonTrees?.[branch] };
    if (!unlocked[nodeId]) return;
    const removed = new Set([nodeId]);
    delete unlocked[nodeId];
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, node] of Object.entries(POKEMON_TREE_NODES)) {
        if (id === "root" || !unlocked[id]) continue;
        if (node.parents.some(parent => unlocked[parent])) continue;
        delete unlocked[id];
        removed.add(id);
        changed = true;
      }
    }
    const update = Object.fromEntries([...removed].map(id => [`system.pokemonTrees.${branch}.-=${id}`, null]));
    let hpRemoved = 0;
    for (const id of removed) {
      const key = treeRollKey(branch, id);
      if (!Object.hasOwn(this.system.pokemonTreeRolls ?? {}, key)) continue;
      hpRemoved += Number(this.system.pokemonTreeRolls[key]) || 0;
      update[`system.pokemonTreeRolls.-=${key}`] = null;
      if (!Object.hasOwn(this.system.pokemonTreeHpHistory ?? {}, key)) {
        update[`system.pokemonTreeHpHistory.${key}`] = this.system.pokemonTreeRolls[key];
      }
    }
    if (hpRemoved) update["system.hp.value"] = Math.max(0, (this.system.hp.value ?? 0) - hpRemoved);
    this.#pokemonTreeBusy = true;
    try { return await this.update(update); }
    finally { this.#pokemonTreeBusy = false; }
  }

  async resetPokemonTree() {
    if (this.type !== "pokemon" || this.#pokemonTreeBusy) return;
    this.#pokemonTreeBusy = true;
    try {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("LOBIA.Tree.resetTitle") },
        content: `<p>${game.i18n.localize("LOBIA.PokemonTree.resetConfirm")}</p>`,
        rejectClose: false, modal: true
      });
      if (!confirmed) return;
      const update = Object.fromEntries(Object.keys(this.system.pokemonTrees ?? {})
        .map(branch => [`system.pokemonTrees.-=${branch}`, null]));
      let hpRemoved = 0;
      for (const [key, value] of Object.entries(this.system.pokemonTreeRolls ?? {})) {
        hpRemoved += Number(value) || 0;
        update[`system.pokemonTreeRolls.-=${key}`] = null;
        if (!Object.hasOwn(this.system.pokemonTreeHpHistory ?? {}, key)) {
          update[`system.pokemonTreeHpHistory.${key}`] = value;
        }
      }
      if (hpRemoved) update["system.hp.value"] = Math.max(0, (this.system.hp.value ?? 0) - hpRemoved);
      if (Object.keys(update).length) return await this.update(update);
    } finally { this.#pokemonTreeBusy = false; }
  }

  /** Add a blank, actor-specific ten-cell branch for a GM to fill in. */
  async addPokemonBranch() {
    if (this.type !== "pokemon" || !game.user.isGM || (this.pack && game.packs.get(this.pack)?.locked)) return;
    const id = `custom-${foundry.utils.randomID()}`;
    return this.update({ [`system.customPokemonBranches.${id}`]: {
      title: "", conditionType: "", conditionLevel: 1, conditionSpecies: "", labels: {}
    } });
  }

  /** Remove only this branch's progression and HP rolls, leaving other trees intact. */
  async deletePokemonBranch(id) {
    if (this.type !== "pokemon" || !game.user.isGM || (this.pack && game.packs.get(this.pack)?.locked) || this.#pokemonTreeBusy
      || !/^custom-[a-zA-Z0-9]+$/.test(id) || !Object.hasOwn(this.system.customPokemonBranches ?? {}, id)) return;
    this.#pokemonTreeBusy = true;
    try {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("LOBIA.PokemonTree.deleteBranch") },
        content: `<p>${game.i18n.localize("LOBIA.PokemonTree.deleteBranchConfirm")}</p>`,
        rejectClose: false, modal: true
      });
      if (!confirmed) return;
      const update = { [`system.customPokemonBranches.-=${id}`]: null };
      if (Object.hasOwn(this.system.pokemonTrees ?? {}, id)) update[`system.pokemonTrees.-=${id}`] = null;
      let hpRemoved = 0;
      for (const [key, value] of Object.entries(this.system.pokemonTreeRolls ?? {})) {
        if (!Object.keys(POKEMON_TREE_NODES).some(node => key === `${id}-${node}`)) continue;
        hpRemoved += Number(value) || 0;
        update[`system.pokemonTreeRolls.-=${key}`] = null;
      }
      for (const key of Object.keys(this.system.pokemonTreeHpHistory ?? {})) {
        if (Object.keys(POKEMON_TREE_NODES).some(node => key === `${id}-${node}`)) {
          update[`system.pokemonTreeHpHistory.-=${key}`] = null;
        }
      }
      if (hpRemoved) update["system.hp.value"] = Math.max(0, (this.system.hp.value ?? 0) - hpRemoved);
      return await this.update(update);
    } finally { this.#pokemonTreeBusy = false; }
  }

  /* -------------------------------------------- */
  /*  Trainer skill tree                          */
  /* -------------------------------------------- */

  /**
   * Unlock a tree cell (spends 1 skill point). No-op if not currently available.
   * Uses a flattened update path so the ObjectField merge inserts the key.
   * @param {string} branch  Branch type key (e.g. "acier").
   * @param {string} nodeId  Tree node id (e.g. "cd1").
   */
  async unlockTreeNode(branch, nodeId) {
    if (this.type !== "trainer") return;
    if (!this.system.branches.includes(branch)) return;
    if (!this.system.isNodeAvailable(branch, nodeId)) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Tree.cannotUnlock"));
      return;
    }
    const update = { [`system.trees.${branch}.${nodeId}`]: true };
    let hpRoll = null;
    if (isHpBonusNode(branch, nodeId)) {
      hpRoll = await new Roll("2d4").evaluate();
      update[`system.treeRolls.${treeRollKey(branch, nodeId)}`] = hpRoll.total;
      update["system.hp.value"] = (this.system.hp.value ?? 0) + hpRoll.total;
    }

    const result = await this.update(update);
    if (hpRoll) {
      await hpRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: game.i18n.format("LOBIA.Tree.hpRoll", { name: this.name })
      });
    }
    return result;
  }

  /**
   * Lock a tree cell and cascade-remove any now-orphaned descendants (refunds points).
   * Deletions use the `-=key` syntax (ObjectField merges, so absent keys are NOT removed).
   * @param {string} branch
   * @param {string} nodeId
   */
  async lockTreeNode(branch, nodeId) {
    if (this.type !== "trainer") return;
    if (TREE_NODES_BY_ID[nodeId]?.kind === "root") return;
    const set = foundry.utils.deepClone(this.system.trees?.[branch] ?? {});
    if (!set[nodeId]) return;

    const removed = new Set([nodeId]);
    delete set[nodeId];

    // Prune descendants whose prerequisite is no longer satisfied (repeat until stable).
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of TREE_NODES) {
        if (node.kind === "root" || !set[node.id]) continue;
        const ok = node.parents.some(p => TREE_NODES_BY_ID[p]?.kind === "root" || set[p]);
        if (!ok) { delete set[node.id]; removed.add(node.id); changed = true; }
      }
    }

    const update = {};
    for (const id of removed) update[`system.trees.${branch}.-=${id}`] = null;

    let hpRemoved = 0;
    for (const id of removed) {
      const key = treeRollKey(branch, id);
      const value = Number(this.system.treeRolls?.[key] ?? 0);
      if (value > 0) {
        hpRemoved += value;
        update[`system.treeRolls.-=${key}`] = null;
      }
    }
    if (hpRemoved > 0) {
      update["system.hp.value"] = Math.max(0, (this.system.hp.value ?? 0) - hpRemoved);
    }

    // Count Compétence slots after removal; if fewer than allocated skill tiers, trim skills.
    const trees = this.system.trees ?? {};
    let slots = 0;
    for (const b of Object.keys(trees)) {
      const s = b === branch ? set : trees[b];
      for (const [id, on] of Object.entries(s)) {
        if (on && TREE_NODES_BY_ID[id]?.kind === "competence") slots++;
      }
    }
    let spent = this.system.skillStepsSpent;
    if (spent > slots) {
      const skills = foundry.utils.deepClone(this.system.skills ?? {});
      for (const key of Object.keys(skills)) {
        while (spent > slots && (skills[key] ?? 0) > 0) { skills[key]--; spent--; }
        if ((skills[key] ?? 0) <= 0) update[`system.skills.-=${key}`] = null;
        else update[`system.skills.${key}`] = skills[key];
      }
    }
    return this.update(update);
  }

  /**
   * Reset the entire skill tree: clear all unlocked cells and all learned skills.
   * Prompts for confirmation.
   */
  async resetTree() {
    if (this.type !== "trainer") return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("LOBIA.Tree.resetTitle") },
      content: `<p>${game.i18n.localize("LOBIA.Tree.resetConfirm")}</p>`,
      rejectClose: false,
      modal: true
    });
    if (!confirmed) return;
    const update = {};
    for (const b of Object.keys(this.system.trees ?? {})) update[`system.trees.-=${b}`] = null;
    for (const k of Object.keys(this.system.skills ?? {})) update[`system.skills.-=${k}`] = null;
    let hpRemoved = 0;
    for (const [key, value] of Object.entries(this.system.treeRolls ?? {})) {
      hpRemoved += Number(value) || 0;
      update[`system.treeRolls.-=${key}`] = null;
    }
    if (hpRemoved > 0) {
      update["system.hp.value"] = Math.max(0, (this.system.hp.value ?? 0) - hpRemoved);
    }
    if (foundry.utils.isEmpty(update)) return;
    return this.update(update);
  }

  /**
   * Learn a new skill (tier 1) or raise an owned skill by one tier (max 3 / MAX).
   * Requires an available skill step and that the skill's type is one of the branches.
   * @param {string} key  Stable skill key.
   */
  async learnOrLevelSkill(key) {
    if (this.type !== "trainer") return;
    const skillType = getSkill(key)?.type;
    if (!this.system.branches.includes(skillType)) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Tree.wrongType"));
      return;
    }
    const current = this.system.skills?.[key] ?? 0;
    if (current >= 3) return;
    if (this.system.skillStepsRemaining <= 0) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Tree.noSteps"));
      return;
    }
    return this.update({ [`system.skills.${key}`]: current + 1 });
  }

  /**
   * Lower an owned skill by one tier (refunds a step), removing it at tier 0.
   * @param {string} key
   */
  async lowerSkill(key) {
    if (this.type !== "trainer") return;
    const current = this.system.skills?.[key] ?? 0;
    if (current <= 0) return;
    const next = current - 1;
    if (next <= 0) return this.update({ [`system.skills.-=${key}`]: null });
    return this.update({ [`system.skills.${key}`]: next });
  }

  /**
   * Refresh all battle resources to their per-turn maximum (value = max).
   * @returns {Promise<LobiaActor>}
   */
  async resetBattleResources() {
    const battle = this.system.battle ?? {};
    const update = {};
    for (const key of Object.keys(battle)) {
      // Refill to the effective total (base max + any tree bonus).
      update[`system.battle.${key}.value`] = battle[key].total ?? battle[key].max;
    }
    return this.update(update);
  }
}
