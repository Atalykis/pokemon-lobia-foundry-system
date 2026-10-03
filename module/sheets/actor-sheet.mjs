import { defensiveProfile } from "../data/type-chart.mjs";
import { getNature, getNatures } from "../data/nature-registry.mjs";
import { getTalent, getTalents } from "../data/talent-registry.mjs";
import { POKEMON_TREE_ROWS, pokemonNodeOpen, pokemonTreeLabel } from "../data/pokemon-tree.mjs";
import { pokemonSpecies } from "../data/pokemon-species.mjs";
import { DIVISION_SLOTS } from "../data/pokemon-division.mjs";
import { isPokemonHpBonus, pokemonHpDice } from "../data/pokemon-hp.mjs";
import { getPokemonMoves, pokemonMove, pokemonMoveCategory } from "../data/pokemon-moves.mjs";
import { pokemonMoveTooltip } from "../data/pokemon-move-tooltip.mjs";
import { rollMetronome } from "../macros/metronome.mjs";
import { COMBAT_STYLES } from "../data/combat-styles.mjs";
import { LOBIA_STATUSES, actorStatusEffects, statusName, statusRule } from "../data/statuses.mjs";
import { acceleratorEffect, ppMaxMoveKeys } from "../data/accelerators.mjs";
import { gmNotesFor, saveGmNotes } from "./actor-notes.mjs";
import { itemTooltip } from "../data/item-tooltip.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const POKEMON_ITEM_SLOTS = ["held", "berry", "equipment"];

/**
 * Shared ApplicationV2 actor-sheet behavior for Pokémon and Trainers.
 * The stat list comes from the actor's own data model, so Pokémon render five
 * stats while Trainers automatically include their four additional stats.
 */
export default class LobiaActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /** The actor name is the Pokémon's nickname, initially its species. */
  get title() {
    return this.actor.type === "pokemon"
      ? this.actor.name
      : super.title;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "actor"],
    position: { width: 760, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rollStat: LobiaActorSheet.#onRollStat,
      resetBattle: LobiaActorSheet.#onResetBattle,
      addStatus: LobiaActorSheet.#onAddStatus,
      removeStatus: LobiaActorSheet.#onRemoveStatus,
      lowerStatus: LobiaActorSheet.#onLowerStatus,
      raiseStatus: LobiaActorSheet.#onRaiseStatus,
      rollNature: LobiaActorSheet.#onRollNature,
      rollMeasurements: LobiaActorSheet.#onRollMeasurements,
      rollShiny: LobiaActorSheet.#onRollShiny,
      rollPokemonHpBonus: LobiaActorSheet.#onRollPokemonHpBonus,
      levelUp: LobiaActorSheet.#onLevelUp,
      levelDown: LobiaActorSheet.#onLevelDown,
      useAccelerator: LobiaActorSheet.#onUseAccelerator,
      removeAccelerator: LobiaActorSheet.#onRemoveAccelerator,
      removeUnusedAccelerator: LobiaActorSheet.#onRemoveUnusedAccelerator,
      chooseCtMove: LobiaActorSheet.#onChooseCtMove,
      openPokemonItem: LobiaActorSheet.#onOpenPokemonItem,
      removePokemonItem: LobiaActorSheet.#onRemovePokemonItem,
      openPokemonItems: LobiaActorSheet.#onOpenPokemonItems,
      editPokemonTalents: LobiaActorSheet.#onEditPokemonTalents,
      rollMetronome: LobiaActorSheet.#onRollMetronome,
      unlockPokemonNode: LobiaActorSheet.#onUnlockPokemonNode,
      lockPokemonNode: LobiaActorSheet.#onLockPokemonNode,
      resetPokemonTree: LobiaActorSheet.#onResetPokemonTree,
      addPokemonBranch: LobiaActorSheet.#onAddPokemonBranch,
      deletePokemonBranch: LobiaActorSheet.#onDeletePokemonBranch,
      editPokemonBranches: LobiaActorSheet.#onEditPokemonBranches,
      saveGmNotes: LobiaActorSheet.#onSaveGmNotes
    }
  };

  /** @override */
  static PARTS = {
    header: { template: "systems/lobia/templates/actor/trainer-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: "systems/lobia/templates/actor/pokemon-main.hbs", scrollable: [""] },
    stats: { template: "systems/lobia/templates/actor/trainer-stats.hbs", scrollable: [""] },
    tree: { template: "systems/lobia/templates/actor/pokemon-tree.hbs", scrollable: [""] },
    moves: { template: "systems/lobia/templates/actor/pokemon-moves.hbs", scrollable: [""] },
    notes: { template: "systems/lobia/templates/actor/notes.hbs", scrollable: [""] },
    gmNotes: { template: "systems/lobia/templates/actor/gm-notes.hbs", scrollable: [""] }
  };

  static TABS = {
    sheet: {
      tabs: [
        { id: "main", icon: "fa-solid fa-id-card" },
        { id: "stats", icon: "fa-solid fa-chart-simple" },
        { id: "tree", icon: "fa-solid fa-sitemap" },
        { id: "moves", icon: "fa-solid fa-bolt" },
        { id: "notes", icon: "fa-solid fa-note-sticky" },
        { id: "gmNotes", icon: "fa-solid fa-lock" }
      ],
      initial: "main",
      labelPrefix: "LOBIA.Tabs"
    }
  };

  _getTabsConfig(group) {
    const config = super._getTabsConfig(group);
    return group === "sheet" && !game.user.isGM
      ? { ...config, tabs: config.tabs.filter(tab => tab.id !== "gmNotes") }
      : config;
  }

  /** The system Pokémon compendium is normally locked; keep editing confined to this sheet session. */
  async _unlockPokemonPack() {
    if (!this.actor.pack) return;
    const pack = game.packs.get(this.actor.pack);
    if (!pack) throw new Error(`Pokémon compendium ${this.actor.pack} is unavailable`);
    if (pack.locked) {
      await pack.configure({ locked: false });
      this._pokemonPackUnlockedBySheet = pack;
    }
  }

  async _relockPokemonPack() {
    const pack = this._pokemonPackUnlockedBySheet;
    if (!pack) return;
    await pack.configure({ locked: true });
    this._pokemonPackUnlockedBySheet = null;
  }

  /** Foundry disables locked-pack forms, including buttons; permit the two GM edit entry points. */
  _toggleDisabled(disabled) {
    super._toggleDisabled(disabled);
    if (disabled && game.user.isGM && this.actor.type === "pokemon" && this.actor.pack) {
      for (const button of this.form?.querySelectorAll('[data-action="addPokemonBranch"], [data-action="editPokemonBranches"], [data-action="editPokemonTalents"]') ?? []) {
        button.disabled = false;
      }
    }
  }

  async close(options) {
    try { return await super.close(options); }
    finally { await this._relockPokemonPack(); }
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId === "gmNotes" && game.user.isGM) partContext.gmNotes = gmNotesFor(this.actor);
    if (partId in (partContext.tabs ?? {})) partContext.tab = partContext.tabs[partId];
    return partContext;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;

    context.actor = this.actor;
    context.system = sys;
    context.isTrainer = this.actor.type === "trainer";
    context.isPokemon = this.actor.type === "pokemon";
    context.isPokemonTemplate = context.isPokemon && Boolean(this.actor.pack);
    context.isGM = game.user.isGM;
    context.canLevelUp = game.user.isGM && !this.actor.pack
      && (context.isPokemon ? sys.identity.level : sys.identity.niveau) < 20;
    context.canLevelDown = game.user.isGM && !this.actor.pack
      && (context.isPokemon ? sys.identity.level : sys.identity.niveau) > 0;
    context.acceleratorCount = sys.acceleratorCount;
    context.acceleratorHistory = Object.entries(sys.accelerators ?? {}).map(([id, entry]) => ({
      id, name: entry.name, canRemove: game.user.isGM && !this.actor.pack,
      detail: entry.moveKey ? (getPokemonMoves().find(move => move.key === entry.moveKey)?.name ?? entry.moveKey)
        : entry.hp ? `+${entry.hp} PV` : ""
    }));
    context.carriedAccelerators = [...(this.actor.items ?? [])]
      .filter(item => acceleratorEffect(item) && item.system.quantity > 0)
      .map(item => ({ id: item.id, name: item.name, quantity: item.system.quantity,
        canUse: !this.actor.pack && context.acceleratorCount < 5
          && (item.name !== "PP Max" || context.isPokemon),
        canRemove: game.user.isGM && !this.actor.pack }));
    context.canEditSpeciesAverages = context.isPokemon && (context.isPokemonTemplate || game.user.isGM);
    context.combatStyleChoices = Object.fromEntries(Object.keys(COMBAT_STYLES)
      .map(key => [key, `LOBIA.CombatStyle.${key}`]));
    context.combatStyleDescription = game.i18n.localize(`LOBIA.CombatStyle.${sys.combatStyle ?? "neutre"}Hint`);
    const activeStatuses = actorStatusEffects(this.actor);
    const activeKeys = new Set(activeStatuses.map(({ status }) => status.key));
    context.canEditStatuses = Boolean(this.actor.isOwner) && !this.actor.pack;
    context.actorStatuses = activeStatuses.map(({ status, level }) => ({
      key: status.key, img: status.img, name: statusName(status), level,
      levelLabel: game.i18n.format("LOBIA.Status.level", { level }),
      rule: statusRule(status, level), canLower: level > 1, canRaise: level < 4
    }));
    context.statusChoices = Object.fromEntries(LOBIA_STATUSES
      .filter(status => !activeKeys.has(status.key)).map(status => [status.key, statusName(status)]));
    context.canAddStatus = context.canEditStatuses && Object.keys(context.statusChoices).length > 0;
    context.statusLevelChoices = Object.fromEntries([1, 2, 3, 4]
      .map(level => [level, game.i18n.format("LOBIA.Status.level", { level })]));

    // Each stat renders as Base + Modifier = Total. `total` is computed, never edited.
    const stats = Object.entries(sys.stats).map(([key, stat]) => {
      const base = stat.base ?? 0;
      const mod = stat.mod ?? 0;
      const natureBonus = stat.natureBonus ?? 0;
      const divisionBonus = stat.divisionBonus ?? 0;
      const styleBonus = stat.styleBonus ?? 0;
      const acceleratorBonus = stat.acceleratorBonus ?? 0;
      const autoBonus = natureBonus + styleBonus + acceleratorBonus + divisionBonus;
      const otherTooltip = styleBonus && natureBonus
        ? game.i18n.format("LOBIA.CombatStyle.bothBreakdown", { base, nature: natureBonus, style: styleBonus })
        : styleBonus ? game.i18n.format("LOBIA.CombatStyle.styleBreakdown", { base, style: styleBonus })
          : natureBonus ? game.i18n.format("LOBIA.Pokemon.natureBreakdown", { base, bonus: natureBonus }) : null;
      const baseTooltip = acceleratorBonus
        ? `${otherTooltip ?? base} + ${acceleratorBonus} (${game.i18n.localize("LOBIA.Accelerator.title")})`
        : otherTooltip;
      const completeTooltip = divisionBonus
        ? `${baseTooltip ?? base} ${divisionBonus > 0 ? "+" : "−"} ${Math.abs(divisionBonus)} (${game.i18n.localize("LOBIA.Divighost.title")})`
        : baseTooltip;
      return {
        key, base, mod,
        effectiveBase: base + autoBonus,
        hasAutomaticBonus: autoBonus !== 0 || natureBonus !== 0 || styleBonus !== 0,
        natureClass: autoBonus < 0 ? "nature-negative" : "has-bonus",
        baseTooltip: completeTooltip,
        statTooltip: completeTooltip
          ? `${game.i18n.localize("LOBIA.RollTooltip")} — ${completeTooltip}`
          : game.i18n.localize("LOBIA.RollTooltip"),
        total: stat.total ?? (base + mod + autoBonus),
        modClass: mod > 0 ? "pos" : (mod < 0 ? "neg" : "zero"),
        label: game.i18n.localize(`LOBIA.Stat.${key}`)
      };
    });

    // Rendered as two separated groups: the shared battle stats, then the
    // trainer-only ones. Empty groups (a Pokémon has no trainer stats) drop out.
    const battleStatKeys = Object.keys(CONFIG.LOBIA.stats);
    context.statGroups = [
      stats.filter(s => battleStatKeys.includes(s.key)),
      stats.filter(s => !battleStatKeys.includes(s.key))
    ].filter(group => group.length > 0);

    // Sum of every base score (modifiers excluded), shown under the stat cards.
    context.statBaseTotal = stats.reduce((sum, s) => sum + s.base, 0);

    // Derived values render like the stats: Base + Modif. = Total. "Base" is everything
    // the system works out on its own (stats + unlocked tree nodes); "Modif." is manual.
    context.derived = Object.entries(sys.derived ?? {}).map(([key, d]) => {
      const bonus = d.bonus ?? 0;
      const mod = d.mod ?? 0;
      const base = (d.base ?? 0) + bonus;
      return {
        key, mod, bonus, base,
        total: d.total ?? (base + mod),
        hasBonus: bonus !== 0,
        baseTooltip: bonus !== 0
          ? game.i18n.format("LOBIA.Derived.baseBreakdown", { base: d.base ?? 0, bonus })
          : null,
        modClass: mod > 0 ? "pos" : (mod < 0 ? "neg" : "zero"),
        icon: CONFIG.LOBIA.derivedIcons[key] ?? "fa-circle-dot",
        label: game.i18n.localize(`LOBIA.Derived.${key}`)
      };
    });

    context.battle = Object.entries(sys.battle ?? {}).map(([key, res]) => {
      const bonus = res.bonus ?? 0;
      return {
        key, value: res.value, max: res.max, bonus,
        total: res.total ?? ((res.max ?? 0) + bonus),
        hasBonus: bonus !== 0,
        icon: CONFIG.LOBIA.battleIcons[key] ?? "fa-circle-dot",
        label: game.i18n.localize(`LOBIA.Battle.${key}`)
      };
    });
    context.combatResources = [{
      key: "hp",
      base: sys.hp.base,
      basePath: "system.hp.base",
      bonus: sys.hp.bonus ?? 0,
      total: sys.hp.max,
      hasBonus: (sys.hp.bonus ?? 0) !== 0,
      tooltip: (() => {
        const esc = foundry.utils.escapeHTML;
        const rolls = Object.entries(sys.levelUpRolls ?? {})
          .filter(([key, value]) => /^level-(?:[1-9]|1\d|20)$/.test(key) && Number.isFinite(Number(value)))
          .sort(([a], [b]) => Number(a.slice(6)) - Number(b.slice(6)));
        const spent = rolls.reduce((sum, [, value]) => sum + Number(value), 0);
        const acceleratorHp = Object.values(sys.accelerators ?? {}).reduce((sum, entry) => sum + (entry.hp ?? 0), 0);
        const lines = [
          [game.i18n.localize("LOBIA.Level.hpOtherBase"), (sys.hp.base ?? 0) - spent - acceleratorHp],
          [game.i18n.localize("LOBIA.Level.hpLevels"), spent],
          [game.i18n.localize("LOBIA.Accelerator.hpBonus"), acceleratorHp],
          [game.i18n.localize("LOBIA.Level.hpTree"), sys.hp.bonus ?? 0]
        ];
        return `<div class="lobia-hp-breakdown"><strong>${esc(game.i18n.localize("LOBIA.Level.hpDetails"))}</strong>`
          + lines.map(([label, value]) => `<div>${esc(label)} <b>${Number(value) >= 0 ? "+" : ""}${Number(value)}</b></div>`).join("")
          + `<div class="lobia-hp-breakdown-total">${esc(game.i18n.localize("LOBIA.StatCol.total"))} <b>${sys.hp.max}</b></div>`
          + rolls.map(([key, value]) => `<div class="lobia-hp-breakdown-roll">${esc(game.i18n.format("LOBIA.Level.hpEntry", { level: key.slice(6) }))} <b>+${Number(value)}</b></div>`).join("")
          + `</div>`;
      })(),
      icon: "fa-heart",
      label: game.i18n.localize("LOBIA.HP")
    }, ...context.battle.map(resource => ({
      ...resource,
      base: resource.max,
      basePath: `system.battle.${resource.key}.max`
    }))];

    const defTypes = context.isTrainer
      ? [CONFIG.LOBIA.trainerBaseType, sys.type?.secondary]
      : [sys.type?.primary, sys.type?.secondary];
    const uniqueDefTypes = defTypes.filter((type, index, all) => type && all.indexOf(type) === index);
    const profile = defensiveProfile(uniqueDefTypes);
    const fmt = multiplier => multiplier === 0.25 ? "×¼" : multiplier === 0.5 ? "×½" : `×${multiplier}`;
    const entry = ([type, mult]) => ({
      type, mult, multLabel: fmt(mult), label: game.i18n.localize(`LOBIA.Type.${type}`)
    });
    context.mainTypes = uniqueDefTypes.map(type => ({
      key: type, label: game.i18n.localize(`LOBIA.Type.${type}`)
    }));
    context.weaknesses = Object.entries(profile).filter(([, mult]) => mult > 1)
      .sort((a, b) => b[1] - a[1]).map(entry);
    context.resistances = Object.entries(profile).filter(([, mult]) => mult > 0 && mult < 1)
      .sort((a, b) => a[1] - b[1]).map(entry);
    context.immunities = Object.entries(profile).filter(([, mult]) => mult === 0).map(entry);
    context.typeChoices = CONFIG.LOBIA.types;

    if (context.isTrainer) {
      context.identity = sys.identity;
      context.baseType = CONFIG.LOBIA.trainerBaseType;
      context.baseTypeLabel = game.i18n.localize(`LOBIA.Type.${CONFIG.LOBIA.trainerBaseType}`);
      context.secondaryType = sys.type?.secondary ?? "";
      context.thirdType = sys.type?.third ?? "";
      context.fourthType = sys.type?.fourth ?? "";
      context.typeBlank = game.i18n.localize("LOBIA.Type.choose");
    }
    else {
      context.primaryType = sys.type?.primary ?? "normal";
      context.secondaryType = sys.type?.secondary ?? "";
      context.canEditPokemonItems = this.actor.isOwner && !this.actor.pack;
      context.pokemonItemSlots = POKEMON_ITEM_SLOTS.map(key => {
        const item = this.actor.items?.find(entry => entry.type === "objet"
          && entry.getFlag("lobia", "pokemonSlot") === key);
        return { key, label: game.i18n.localize(`LOBIA.PokemonInventory.${key}`),
          item: item && { id: item.id, name: item.name, img: item.img, tooltip: itemTooltip(item) } };
      });
      context.pokemonIdentity = sys.identity;
      context.pokemonDisplayName = this.actor.name;
      context.canRollPokemonNature = !context.isPokemonTemplate && !sys.identity.nature && !sys.identity.natureRolled;
      context.canRollPokemonMeasurements = !context.isPokemonTemplate && !(sys.identity.sizeRoll > 0);
      context.canRollPokemonShiny = !context.isPokemonTemplate && !(sys.identity.shinyRoll > 0);
      context.pokemonSexChoices = {
        male: "LOBIA.Pokemon.male", female: "LOBIA.Pokemon.female", none: "LOBIA.Pokemon.none"
      };
      context.natureChoices = Object.fromEntries(getNatures().map(nature => [nature.key, nature.name]));
      const selectedNature = getNature(sys.identity.nature);
      context.pokemonNatureName = selectedNature?.name ?? sys.identity.nature;
      if (sys.identity.nature && !selectedNature) context.natureChoices[sys.identity.nature] = sys.identity.nature;
      context.talentOptions = ["first", "second", "third"].filter(slot => sys.talents?.[slot])
        .map(slot => ({
          slot,
          slotLabel: game.i18n.localize(`LOBIA.Pokemon.talent${["first", "second", "third"].indexOf(slot) + 1}`),
          name: getTalent(sys.talents[slot])?.name ?? sys.talents[slot],
          selected: sys.talents.selected === slot
        }));
      context.canManagePokemonTalents = game.user.isGM;
      context.editPokemonTalents = game.user.isGM && (!this.actor.pack || Boolean(this.editPokemonTalents));
      context.talentSlots = ["first", "second", "third"].map((slot, index) => ({
        slot, label: game.i18n.localize(`LOBIA.Pokemon.talent${index + 1}`),
        selected: sys.talents?.[slot] ?? ""
      }));
      context.talentChoices = Object.fromEntries(getTalents().map(talent => [talent.key, talent.name]));
      for (const { selected } of context.talentSlots) {
        if (selected && !context.talentChoices[selected]) context.talentChoices[selected] = selected;
      }
      const selectedKey = sys.talents?.[sys.talents?.selected];
      context.selectedTalent = selectedKey ? (getTalent(selectedKey) ?? { name: selectedKey, effect: "" }) : null;
      context.pokemonTreePoints = {
        total: sys.pokemonTreePointsTotal, spent: sys.pokemonTreePointsSpent,
        remaining: sys.pokemonTreePointsRemaining
      };
      const division = pokemonSpecies(sys.species?.name || this.actor.name)?.division;
      if (division) {
        context.divisionRoleChoices = Object.fromEntries(Object.entries(division.roles)
          .map(([id, role]) => [id, `${role.name} (${Object.entries(role.stats)
            .map(([stat, value]) => `${game.i18n.localize(`LOBIA.Stat.${stat}`)} ${value > 0 ? "+" : ""}${value}`)
            .join(", ") || "—"})`]));
        context.divisionMembers = DIVISION_SLOTS.map((slot, index) => ({
          slot, number: index + 1, role: sys.divisionMembers?.[slot] ?? "",
          image: division.roles[sys.divisionMembers?.[slot]]?.image
        }));
      }
      context.dominantTypeChoices = sys.identity.dominant && !context.isPokemonTemplate
        ? sys.dominantTypes.map(type => ({ key: type, name: game.i18n.localize(`LOBIA.Type.${type}`),
          selected: sys.dominantTreeType === type })) : [];
      context.dominantTypePending = context.dominantTypeChoices.length > 1 && !sys.dominantTreeType;
      context.dominantTypeLocked = Object.keys(sys.pokemonTrees ?? {})
        .some(id => id.startsWith("dominant-") && Object.values(sys.pokemonTrees[id] ?? {}).some(Boolean));
      context.canEditPokemonBranches = game.user.isGM;
      context.editPokemonBranches = context.canEditPokemonBranches && Boolean(this.editPokemonBranches);
      const moveLabels = Object.fromEntries(["class", "damage", "difficulty", "contact"]
        .map(key => [key, game.i18n.localize(`LOBIA.PokemonMoves.${key}`)]));
      const moveCard = (move, name, note, includeCategory = true) => pokemonMoveTooltip(move, {
        name, note, typeLabel: game.i18n.localize(`LOBIA.Type.${move.type}`),
        categoryLabel: includeCategory ? pokemonMoveCategory(move.category) : "", labels: moveLabels,
        escape: foundry.utils.escapeHTML
      });
      const catalogueMoves = new Map(getPokemonMoves().map(move => [move.key, move]));
      context.ctSlots = sys.ctBranches.map((branch, index) => {
        const move = catalogueMoves.get(sys.ctMoves?.[branch.id]);
         return { branch: branch.id, number: index + 1, name: branch.custom ? "" : branch.title || branch.species || "",
          moveName: move?.name ?? "", moveTooltip: move ? moveCard(move, move.name,
            game.i18n.localize("LOBIA.CT.learned")) : null,
          canEdit: this.actor.isOwner && !context.isPokemonTemplate };
      });
      const learnedMoves = new Map();
      const ppMaxMoves = ppMaxMoveKeys(sys.accelerators);
      const hpDice = pokemonHpDice(sys.species?.hpFormula || pokemonSpecies(sys.species?.name || this.actor.name)?.hpFormula);
      context.pokemonBranches = sys.treeProfile.branches.map(branch => ({
        id: branch.id,
        custom: Boolean(branch.custom),
        dominant: Boolean(branch.dominant),
        divisionRole: Boolean(branch.divisionRole),
        divisionSelected: branch.divisionRole && sys.treeProfile.selectedDivisionRoles.includes(branch.divisionRole),
        divisionImage: division?.roles[branch.divisionRole]?.image,
        dominantName: branch.dominant ? game.i18n.localize(`LOBIA.Type.${branch.type}`) : "",
        title: branch.divisionSlot
          ? `${game.i18n.localize("LOBIA.Divighost.member")} ${DIVISION_SLOTS.indexOf(branch.divisionSlot) + 1} — ${branch.title}`
          : branch.title,
        conditionType: branch.conditionType,
        conditionLevel: branch.conditionLevel,
        conditionSpecies: branch.conditionSpecies,
        conditionNone: !branch.conditionType,
        conditionIsLevel: branch.conditionType === "level",
        conditionIsEvolution: branch.conditionType === "evolution",
        future: !pokemonNodeOpen(sys.treeProfile, branch, "root", sys.identity.level),
        unlockHint: branch.divisionRole && !sys.treeProfile.selectedDivisionRoles.includes(branch.divisionRole)
          ? game.i18n.localize("LOBIA.Divighost.selectRole")
          : branch.custom && branch.conditionType === "level"
          ? game.i18n.format("LOBIA.PokemonTree.levelRequired", { level: branch.conditionLevel })
          : branch.custom && branch.conditionType === "evolution"
            ? game.i18n.format("LOBIA.PokemonTree.speciesRequired", { species: branch.conditionSpecies || "—" })
            : branch.notes?.root ?? (branch.minLevel && sys.identity.level < branch.minLevel && sys.treeProfile.stage === 0
          ? game.i18n.format("LOBIA.PokemonTree.levelRequired", { level: branch.minLevel })
          : game.i18n.localize("LOBIA.PokemonTree.future")),
        placeholder: !branch.species,
        rows: POKEMON_TREE_ROWS.map(row => row.filter(id => branch.custom || branch.labels[id]).map(id => {
           const unlocked = sys.pokemonTrees?.[branch.id]?.[id] === true;
           const available = sys.isPokemonNodeAvailable(branch.id, id);
           const restricted = !pokemonNodeOpen(sys.treeProfile, branch, id, sys.identity.level);
           const sourceLabel = pokemonTreeLabel(sys.treeProfile, branch, id);
            const move = pokemonMove(sourceLabel);
             const label = move?.name ?? sourceLabel;
             const ppMaxUnlocked = Boolean(move && ppMaxMoves.has(move.key));
            const hpKey = `${branch.id}-${id}`;
            const hpNode = isPokemonHpBonus(sourceLabel);
             const hasHpRoll = Object.hasOwn(sys.pokemonTreeRolls ?? {}, hpKey);
             const hpRoll = unlocked && hasHpRoll ? sys.pokemonTreeRolls[hpKey] : null;
             const hpSaved = !unlocked && hpNode ? sys.pokemonTreeHpHistory?.[hpKey] : null;
             const moveTooltip = move ? moveCard(move, label, ppMaxUnlocked
               ? [branch.notes?.[id], game.i18n.localize("LOBIA.Accelerator.ppMax")].filter(Boolean).join(" — ")
               : branch.notes?.[id]) : null;
           if (unlocked && !restricted && move && !learnedMoves.has(move.key)) {
             learnedMoves.set(move.key, { ...move, cardHtml: moveCard(move, label, branch.notes?.[id], false),
               isMetronome: move.key === "normal-metronome" && !context.isPokemonTemplate });
           }
           return {
               id, branch: branch.id, label: label || "—", rawLabel: sourceLabel,
               restricted,
               ppMaxUnlocked,
               tooltip: hpRoll != null
                 ? `${branch.notes?.[id] ?? label} — ${game.i18n.format("LOBIA.PokemonTree.hpBonus", { amount: hpRoll, dice: hpDice ?? "—" })}`
                 : hpSaved != null
                   ? `${branch.notes?.[id] ?? label} — ${game.i18n.format("LOBIA.PokemonTree.hpSaved", { amount: hpSaved })}`
                 : branch.notes?.[id] ?? label,
              moveTooltip,
               hpRoll,
               hpSaved,
               hpRollMissing: unlocked && hpNode && !hasHpRoll && !context.isPokemonTemplate && !context.editPokemonBranches,
             kind: id === "root" ? "root" : (id === "end" ? "terminal" : "bonus"),
             status: unlocked ? "unlocked" : (available ? "available" : "locked"),
              action: context.editPokemonBranches || !branch.species || context.isPokemonTemplate ? null
               : (unlocked ? "lockPokemonNode" : (available ? "unlockPokemonNode" : null))
           };
        }))
      }));
      context.pokemonMoves = [...learnedMoves.values()];
      for (const moveKey of ppMaxMoves) {
        if (learnedMoves.has(moveKey)) continue;
        const move = getPokemonMoves().find(move => move.key === moveKey);
        if (move) context.pokemonMoves.push({ ...move,
          cardHtml: moveCard(move, move.name, game.i18n.localize("LOBIA.Accelerator.ppMax"), false) });
      }
      const displayedMoves = new Set([...learnedMoves.keys(), ...ppMaxMoves]);
      for (const slot of context.ctSlots) {
        const move = catalogueMoves.get(sys.ctMoves?.[slot.branch]);
        if (!move || displayedMoves.has(move.key)) continue;
        displayedMoves.add(move.key);
        context.pokemonMoves.push({ ...move,
          cardHtml: moveCard(move, move.name, game.i18n.localize("LOBIA.CT.learned"), false),
          isMetronome: move.key === "normal-metronome" && !context.isPokemonTemplate });
      }
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Handle a click on a stat to roll a d100 check against it.
   * @this {LobiaActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onRollStat(event, target) {
    const statKey = target.dataset.stat;
    this.actor.rollStat(statKey);
  }

  /**
   * Refresh this actor's battle resources to their per-turn maximum.
   * @this {LobiaActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onResetBattle(event, target) {
    this.actor.resetBattleResources();
  }

  static #onAddStatus(event, target) {
    const panel = target.closest(".lobia-status-panel");
    const key = panel?.querySelector('[data-role="lobia-status-key"]')?.value;
    const level = Number(panel?.querySelector('[data-role="lobia-status-level"]')?.value);
    if (key) this.actor.setLobiaStatus(key, level);
  }

  static #onRemoveStatus(event, target) {
    this.actor.removeLobiaStatus(target.dataset.status);
  }

  static #onLowerStatus(event, target) {
    this.actor.setLobiaStatus(target.dataset.status, Number(target.dataset.level) - 1);
  }

  static #onRaiseStatus(event, target) {
    this.actor.setLobiaStatus(target.dataset.status, Number(target.dataset.level) + 1);
  }

  static #onRollNature() {
    this.actor.rollPokemonNature();
  }

  static #onRollMeasurements() {
    this.actor.rollPokemonMeasurements();
  }

  static #onRollShiny() {
    this.actor.rollPokemonShiny();
  }

  static #onRollPokemonHpBonus(event, target) {
    this.actor.rollPokemonHpBonus(target.dataset.branch, target.dataset.node);
  }

  static #onLevelUp() {
    this.actor.levelUp();
  }

  static #onLevelDown() {
    this.actor.levelDown();
  }

  static #onRemoveAccelerator(event, target) {
    this.actor.removeAccelerator(target.dataset.acceleratorId);
  }

  static async #onRemoveUnusedAccelerator(event, target) {
    if (!game.user.isGM || this.actor.pack) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!acceleratorEffect(item) || !(item.system.quantity > 0)) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("LOBIA.Item.deleteTitle") },
      content: `<p>${game.i18n.format("LOBIA.Accelerator.deleteUnusedConfirm", {
        name: foundry.utils.escapeHTML(item.name), quantity: item.system.quantity
      })}</p>`
    });
    if (confirmed) await this.actor.removeUnusedAccelerator(item.id);
  }

  static async #onUseAccelerator(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!acceleratorEffect(item)) return;
    let moveKey = null;
    if (item.name === "PP Max") {
      const moves = this.actor.availableAcceleratorMoves;
      if (!moves.length) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Accelerator.noMoves"));
        return;
      }
      moveKey = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("LOBIA.Accelerator.chooseMove") },
        content: `<select name="move">${moves.map(move => `<option value="${foundry.utils.escapeHTML(move.key)}">${foundry.utils.escapeHTML(move.name)}</option>`).join("")}</select>`,
        buttons: [{ action: "choose", label: game.i18n.localize("LOBIA.Accelerator.use"),
          callback: (_event, button) => button.form.elements.move.value },
        { action: "cancel", label: game.i18n.localize("Cancel") }]
      });
      if (!moveKey) return;
    }
    await this.actor.useAccelerator(item.id, moveKey);
  }

  static async #onChooseCtMove(event, target) {
    const branch = target.dataset.branch;
    if (!this.actor.isOwner || this.actor.pack
      || !this.actor.system.ctBranches.some(entry => entry.id === branch)) return;
    const current = this.actor.system.ctMoves?.[branch] ?? "";
    const esc = foundry.utils.escapeHTML;
    const moves = [...getPokemonMoves()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const selection = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("LOBIA.CT.choose") },
      content: `<p>${esc(game.i18n.localize("LOBIA.CT.rpHint"))}</p>`
        + `<select name="move"><option value="">${esc(game.i18n.localize("LOBIA.CT.empty"))}</option>`
        + moves.map(move => `<option value="${esc(move.key)}"${move.key === current ? " selected" : ""}>${esc(move.name)}</option>`).join("")
        + `</select>`,
      buttons: [{ action: "save", label: game.i18n.localize("LOBIA.CT.save"),
        callback: (_event, button) => button.form.elements.move.value },
      { action: "cancel", label: game.i18n.localize("Cancel"), callback: () => null }]
    });
    if (selection !== null && selection !== undefined) await this.actor.setCtMove(branch, selection);
  }

  /** Both actor sheets accept catalogue items dropped onto the accelerator panel. */
  async _onDropItem(event, item) {
    const slot = event.target.closest?.("[data-pokemon-item-slot]")?.dataset.pokemonItemSlot;
    if (slot && this.actor.type === "pokemon") {
      if (!this.actor.isOwner || this.actor.pack || !POKEMON_ITEM_SLOTS.includes(slot)) return null;
      if (item.type !== "objet") {
        ui.notifications.warn(game.i18n.localize("LOBIA.Item.wrongType"));
        return null;
      }
      if (this.actor.items.some(entry => entry.type === "objet" && entry !== item
        && entry.getFlag("lobia", "pokemonSlot") === slot)) {
        ui.notifications.warn(game.i18n.localize("LOBIA.Item.slotTaken"));
        return null;
      }
      if (item.parent === this.actor) {
        await item.setFlag("lobia", "pokemonSlot", slot);
        return item;
      }
      const data = item.toObject();
      delete data._id;
      data.system = { ...data.system, slot: null, quantity: 1 };
      data.flags = { ...data.flags, lobia: { ...data.flags?.lobia, pokemonSlot: slot } };
      const [created] = await Item.implementation.createDocuments([data], { parent: this.actor });
      return created ?? null;
    }
    if (!event.target.closest?.("[data-accelerator-drop]")) return super._onDropItem(event, item);
    if (!this.actor.isOwner || this.actor.pack || !acceleratorEffect(item)) return null;
    if (item.parent === this.actor) return item;
    const [created] = await Item.implementation.createDocuments([item.toObject()], { parent: this.actor });
    return created ?? null;
  }

  static #onOpenPokemonItem(event, target) {
    if (this.actor.type !== "pokemon") return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (item?.getFlag("lobia", "pokemonSlot") === target.dataset.slot) item.sheet.render(true);
  }

  static async #onRemovePokemonItem(event, target) {
    if (this.actor.type !== "pokemon" || !this.actor.isOwner || this.actor.pack) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (item?.getFlag("lobia", "pokemonSlot") === target.dataset.slot) await item.delete();
  }

  static #onOpenPokemonItems() {
    if (this.actor.type !== "pokemon") return;
    const pack = game.packs.get(`world.${CONFIG.LOBIA.itemPack.name}`);
    if (pack) return pack.render(true);
    ui.notifications.error(game.i18n.localize("LOBIA.Item.packMissing"));
  }

  static async #onEditPokemonTalents() {
    if (!game.user.isGM || !this.actor.pack) return;
    if (!this.editPokemonTalents) await this._unlockPokemonPack();
    this.editPokemonTalents = !this.editPokemonTalents;
    if (!this.editPokemonTalents && !this.editPokemonBranches) await this._relockPokemonPack();
    this.render();
  }

  static #onRollMetronome() {
    rollMetronome({ actor: this.actor });
  }

  static #onUnlockPokemonNode(event, target) {
    this.actor.unlockPokemonNode(target.dataset.branch, target.dataset.node);
  }

  static #onLockPokemonNode(event, target) {
    this.actor.lockPokemonNode(target.dataset.branch, target.dataset.node);
  }

  static #onResetPokemonTree() {
    this.actor.resetPokemonTree();
  }

  static async #onSaveGmNotes(event, target) {
    if (!game.user.isGM) return;
    await saveGmNotes(this.actor, target.closest(".lobia-notes")?.querySelector("textarea")?.value ?? "");
  }

  static async #onAddPokemonBranch() {
    if (!game.user.isGM) return;
    await this._unlockPokemonPack();
    this.editPokemonBranches = true;
    await this.actor.addPokemonBranch();
  }

  static #onDeletePokemonBranch(event, target) {
    if (game.user.isGM) this.actor.deletePokemonBranch(target.dataset.branch);
  }

  static async #onEditPokemonBranches() {
    if (!game.user.isGM) return;
    if (!this.editPokemonBranches) await this._unlockPokemonPack();
    this.editPokemonBranches = !this.editPokemonBranches;
    if (!this.editPokemonBranches && !this.editPokemonTalents) await this._relockPokemonPack();
    this.render();
  }

}
