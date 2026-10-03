import LobiaActorSheet from "./actor-sheet.mjs";
import { TREE_DISPLAY_ROWS, TREE_NODES_BY_ID } from "../data/tree-template.mjs";
import { getSkills, getTreeLabels } from "../data/skill-registry.mjs";
import { itemTaxonomy, itemCategoryName, itemSubcategoryName, customItemCategories } from "../data/item-taxonomy.mjs";
import { itemTooltip } from "../data/item-tooltip.mjs";
import { deleteItemCategory, saveItemCategoryLabels } from "../data/item-category-management.mjs";
import { ensureFolders } from "../packs/item-pack.mjs";

/**
 * Trainer sheet: the shared actor body (main tab) plus the 4-branch skill tree (tree tab).
 */
export default class LobiaTrainerSheet extends LobiaActorSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "actor", "trainer"],
    position: { width: 760, height: 760 },
    actions: {
      unlockNode: LobiaTrainerSheet.#onUnlockNode,
      lockNode: LobiaTrainerSheet.#onLockNode,
      learnSkill: LobiaTrainerSheet.#onLearnSkill,
      lowerSkill: LobiaTrainerSheet.#onLowerSkill,
      resetTree: LobiaTrainerSheet.#onResetTree,
      openItem: LobiaTrainerSheet.#onOpenItem,
      openItemCompendium: LobiaTrainerSheet.#onOpenItemCompendium,
      deleteItem: LobiaTrainerSheet.#onDeleteItem,
      adjustQuantity: LobiaTrainerSheet.#onAdjustQuantity,
      createItemCategory: LobiaTrainerSheet.#onCreateItemCategory,
      editItemCategory: LobiaTrainerSheet.#onEditItemCategory,
      deleteItemCategory: LobiaTrainerSheet.#onDeleteItemCategory
    }
  };

  /** @override */
  static PARTS = {
    header: { template: "systems/lobia/templates/actor/trainer-header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: "systems/lobia/templates/actor/trainer-main.hbs", scrollable: [""] },
    stats: { template: "systems/lobia/templates/actor/trainer-stats.hbs", scrollable: [""] },
    tree: { template: "systems/lobia/templates/actor/trainer-tree.hbs", scrollable: [""] },
    inventory: { template: "systems/lobia/templates/actor/trainer-inventory.hbs", scrollable: [""] },
    notes: { template: "systems/lobia/templates/actor/notes.hbs", scrollable: [""] },
    gmNotes: { template: "systems/lobia/templates/actor/gm-notes.hbs", scrollable: [""] }
  };

  /** @override */
  static TABS = {
    sheet: {
      tabs: [
        { id: "main", icon: "fa-solid fa-id-card" },
        { id: "stats", icon: "fa-solid fa-chart-simple" },
        { id: "tree", icon: "fa-solid fa-sitemap" },
        { id: "inventory", icon: "fa-solid fa-box-open" },
        { id: "notes", icon: "fa-solid fa-note-sticky" },
        { id: "gmNotes", icon: "fa-solid fa-lock" }
      ],
      initial: "main",
      labelPrefix: "LOBIA.Tabs"
    }
  };

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId in (partContext.tabs ?? {})) partContext.tab = partContext.tabs[partId];
    return partContext;
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;

    context.skillPoints = {
      total: sys.skillPointsTotal,
      spent: sys.skillPointsSpent,
      remaining: sys.skillPointsRemaining
    };
    context.skillSteps = {
      slots: sys.competenceSlots,
      spent: sys.skillStepsSpent,
      remaining: sys.skillStepsRemaining
    };

    // Build each branch's tree as rows of node view-models.
    context.branchTrees = sys.branches.map(branch => ({
      type: branch,
      label: game.i18n.localize(`LOBIA.Type.${branch}`),
      rows: TREE_DISPLAY_ROWS.map(ids => ids.map(id => this.#nodeVM(branch, id)))
    }));

    // Skill acquisition panel: each branch type's 11 skills with current tier + effect.
    context.skillPanel = sys.branches.map(branch => ({
      type: branch,
      label: game.i18n.localize(`LOBIA.Type.${branch}`),
      skills: getSkills(branch).map(s => {
        const tier = sys.skills?.[s.key] ?? 0;
        return {
          key: s.key,
          name: s.name,
          category: s.category,
          tier,
          maxed: tier >= 3,
          effect: tier > 0 ? s.tiers[tier] : s.tiers["1"],
          canLevel: tier < 3 && sys.skillStepsRemaining > 0,
          canLower: tier > 0
        };
      })
        // Acquired skills (tier > 0) first; otherwise keep the spreadsheet order (stable sort).
        .sort((a, b) => (b.tier > 0) - (a.tier > 0))
    }));

    this.#prepareInventory(context);

    return context;
  }

  /* -------------------------------------------- */
  /*  Inventory                                   */
  /* -------------------------------------------- */

  /**
   * Bucket the trainer's embedded Items for the Inventaire tab.
   * Weapons/accessories sit in the 3 fixed slots; the other big categories are
   * uncapped buckets, grouped inside by sub-category.
   * @param {object} context
   */
  #prepareInventory(context) {
    const items = this.actor.items.filter(i => i.type === "objet");
    const inCategory = key => items.filter(i => i.system.category === key);

    context.weaponSlotLabels = { arme: itemCategoryName("arme"), accessoire: itemCategoryName("accessoire") };

    context.weaponSlots = Array.fromRange(CONFIG.LOBIA.weaponSlots).map(slot => ({
      slot,
      index: slot + 1,
      weapon: this.#itemVM(items.find(i => (i.system.category === "arme") && (i.system.slot === slot))),
      accessory: this.#itemVM(items.find(i => (i.system.category === "accessoire") && (i.system.slot === slot)))
    }));

    // Weapons and accessories that are carried but not slotted, so nothing is ever hidden.
    context.reserve = [...inCategory("arme"), ...inCategory("accessoire")]
      .filter(i => i.system.slot === null)
      .map(i => this.#itemVM(i));

    context.canCreateItemCategory = game.user.isGM;
    const customKeys = new Set(customItemCategories().map(category => category.key));
    context.buckets = itemTaxonomy().filter(cat =>
      CONFIG.LOBIA.inventoryBuckets.includes(cat.key) || customKeys.has(cat.key)
    ).map(category => {
      const key = category.key;
      const owned = inCategory(key);
      return {
        key,
        icon: category.icon,
        label: itemCategoryName(key),
        canEdit: game.user.isGM,
        canDelete: game.user.isGM && customKeys.has(key),
        count: owned.reduce((n, i) => n + (i.system.quantity ?? 1), 0),
        // Only sub-categories the trainer actually carries something in are shown.
        groups: category.subs
          .map(sub => `${key}-${sub}`)
          .map(subKey => ({
            key: subKey,
            label: itemSubcategoryName(subKey),
            items: owned.filter(i => i.system.subcategory === subKey).map(i => this.#itemVM(i))
          }))
          .filter(group => group.items.length > 0)
      };
    });

    context.inventoryNotes = this.actor.system.inventory?.autres ?? "";
  }

  /**
   * View-model for one inventory row, including the HTML hover card.
   * @param {Item|undefined} item
   * @returns {object|null}
   */
  #itemVM(item) {
    if (!item) return null;
    const sys = item.system;
    return {
      id: item.id,
      name: item.name,
      img: item.img,
      quantity: sys.quantity,
      tooltip: itemTooltip(item)
    };
  }

  /* -------------------------------------------- */

  /**
   * Route a dropped Item into the bucket (or weapon slot) it landed on.
   * A drop never changes what an item *is* — only where it is carried — so the
   * sub-category is kept and the drop is refused if it does not belong here.
   * @inheritDoc
   */
  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    if (item.type !== "objet") {
      ui.notifications.warn(game.i18n.localize("LOBIA.Item.wrongType"));
      return null;
    }

    const zone = event.target.closest?.("[data-drop-category]");
    if (!zone) return super._onDropItem(event, item);

    const category = zone.dataset.dropCategory;
    const slot = zone.dataset.dropSlot === undefined ? null : Number(zone.dataset.dropSlot);

    if (item.system.category !== category) {
      ui.notifications.warn(game.i18n.format("LOBIA.Item.wrongBucket", {
        name: item.name,
        category: itemCategoryName(item.system.category)
      }));
      return null;
    }

    // A weapon slot holds exactly one item: never silently discard what is already there.
    if ((slot !== null) && this.#slotOccupant(category, slot, item.id)) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Item.slotTaken"));
      return null;
    }

    // Already on this actor? Just move it rather than creating a duplicate.
    if (item.parent === this.actor) {
      await item.update({ "system.slot": slot });
      return item;
    }

    const data = item.toObject();
    data.system = { ...data.system, slot };
    const [created] = await Item.implementation.createDocuments([data], { parent: this.actor });
    return created ?? null;
  }

  /**
   * The item currently filling a weapon/accessory slot, if any.
   * @param {string} category
   * @param {number} slot
   * @param {string} [ignoreId]  An item id to disregard (the one being moved).
   * @returns {Item|undefined}
   */
  #slotOccupant(category, slot, ignoreId) {
    return this.actor.items.find(i => (i.type === "objet")
      && (i.system.category === category)
      && (i.system.slot === slot)
      && (i.id !== ignoreId));
  }

  /**
   * Build a view-model for a single tree cell.
   * @param {string} branch
   * @param {string} nodeId
   * @returns {object}
   */
  #nodeVM(branch, nodeId) {
    const node = TREE_NODES_BY_ID[nodeId];
    const sys = this.actor.system;
    const unlocked = sys.isNodeUnlocked(branch, nodeId);
    const available = sys.isNodeAvailable(branch, nodeId);

    let label;
    switch (node.kind) {
      case "root": label = game.i18n.localize(`LOBIA.Type.${branch}`); break;
      case "competence": label = game.i18n.localize("LOBIA.Tree.competence"); break;
      case "terminal": label = game.i18n.localize("LOBIA.Tree.terminal"); break;
      default: label = getTreeLabels(branch)[node.labelSlot] ?? node.labelSlot;
    }

    const rollResult = sys.treeRolls?.[`${branch}-${nodeId}`];
    if (unlocked && Number.isFinite(rollResult)) {
      label = game.i18n.format("LOBIA.Tree.hpResult", { label, result: rollResult });
    }

    let status, action = null;
    if (unlocked) { status = "unlocked"; if (node.cost > 0) action = "lockNode"; }
    else if (available) { status = "available"; action = "unlockNode"; }
    else { status = "locked"; }

    return { id: nodeId, branch, kind: node.kind, label, unlocked, available, status, action };
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onUnlockNode(event, target) {
    this.actor.unlockTreeNode(target.dataset.branch, target.dataset.node);
  }

  static #onLockNode(event, target) {
    this.actor.lockTreeNode(target.dataset.branch, target.dataset.node);
  }

  static #onLearnSkill(event, target) {
    this.actor.learnOrLevelSkill(target.dataset.key);
  }

  static #onLowerSkill(event, target) {
    this.actor.lowerSkill(target.dataset.key);
  }

  static #onResetTree(event, target) {
    this.actor.resetTree();
  }

  /* -------------------------------------------- */
  /*  Inventory actions                           */
  /* -------------------------------------------- */

  /** Open the sheet of an inventory item. */
  static #onOpenItem(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render(true);
  }

  /** Open the item catalogue so an item can be dragged into the inventory. */
  static #onOpenItemCompendium() {
    const pack = game.packs.get(`world.${CONFIG.LOBIA.itemPack.name}`);
    if (pack) return pack.render(true);
    ui.notifications.error(game.i18n.localize("LOBIA.Item.packMissing"));
  }

  /** Add a world-wide object category with a matching stash on every trainer. */
  static async #onCreateItemCategory() {
    if (!game.user.isGM) return;
    const name = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("LOBIA.Item.createCategory") },
      content: `<label>${foundry.utils.escapeHTML(game.i18n.localize("LOBIA.Item.categoryName"))}
        <input type="text" name="categoryName" maxlength="80" required></label>`,
      buttons: [{ action: "create", label: game.i18n.localize("LOBIA.Item.createCategory"), default: true,
        callback: (_event, button) => button.form.elements.categoryName.value.trim() },
      { action: "cancel", label: game.i18n.localize("Cancel"), callback: () => null }]
    });
    if (name === null || name === undefined) return;
    const categories = customItemCategories();
    if (!name || itemTaxonomy().some(c => itemCategoryName(c.key).toLocaleLowerCase() === name.toLocaleLowerCase())) {
      ui.notifications.warn(game.i18n.localize("LOBIA.Item.invalidCategory"));
      return;
    }
    const key = `custom-${foundry.utils.randomID(12).toLowerCase()}`;
    await game.settings.set("lobia", "customItemCategories", [...categories, { key, name }]);
    this.render();
    const pack = game.packs.get(`world.${CONFIG.LOBIA.itemPack.name}`);
    if (pack) await ensureFolders(pack, [`${key}-general`]);
  }

  /** Edit category names and add or remove subcategories without changing remaining item keys. */
  static async #onEditItemCategory(event, target) {
    if (!game.user.isGM) return;
    const esc = foundry.utils.escapeHTML;
    let key = target.dataset.category;
    if (!key) {
      key = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n.localize("LOBIA.Item.editCategory") },
        content: `<select name="category">${itemTaxonomy().map(cat =>
          `<option value="${esc(cat.key)}">${esc(itemCategoryName(cat.key))}</option>`).join("")}</select>`,
        buttons: [{ action: "choose", label: game.i18n.localize("LOBIA.Item.editCategory"), default: true,
          callback: (_event, button) => button.form.elements.category.value },
        { action: "cancel", label: game.i18n.localize("Cancel"), callback: () => null }]
      });
    }
    const category = itemTaxonomy().find(cat => cat.key === key);
    if (!category) return;
    const subKeys = category.subs.map(sub => `${key}-${sub}`);
    const fields = `<label>${esc(game.i18n.localize("LOBIA.Item.categoryName"))}
      <input type="text" name="categoryName" value="${esc(itemCategoryName(key))}" maxlength="80" required></label>`
      + subKeys.map((sub, i) => `<div class="lobia-subcategory-row">
        <label>${esc(game.i18n.localize("LOBIA.Item.subcategoryName"))} (${esc(sub)})
          <input type="text" name="sub${i}" value="${esc(itemSubcategoryName(sub))}" maxlength="80"></label>
        <label><input type="checkbox" name="remove${i}"> ${esc(game.i18n.localize("LOBIA.Item.removeSubcategory"))}</label>
      </div>`).join("")
      + `<label>${esc(game.i18n.localize("LOBIA.Item.addSubcategory"))}
        <input type="text" name="addSubcategory" maxlength="80"></label>`;
    const selection = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("LOBIA.Item.editCategory") },
      content: `<div class="lobia-category-fields">${fields}</div>`,
      buttons: [{ action: "save", label: game.i18n.localize("LOBIA.Item.saveCategory"), default: true,
        callback: (_event, button) => ({ name: button.form.elements.categoryName.value,
          subs: Object.fromEntries(subKeys.map((sub, i) => [sub, button.form.elements[`sub${i}`].value])),
          addName: button.form.elements.addSubcategory.value,
          remove: subKeys.filter((_sub, i) => button.form.elements[`remove${i}`].checked) }) },
      { action: "cancel", label: game.i18n.localize("Cancel"), callback: () => null }]
    });
    if (!selection) return;
    if (selection.remove.length) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("LOBIA.Item.removeSubcategory") },
        content: `<p>${esc(game.i18n.localize("LOBIA.Item.removeSubcategoryConfirm"))}</p>`
      });
      if (!confirmed) return;
    }
    const result = await saveItemCategoryLabels(key, selection.name, selection.subs,
      { addName: selection.addName, remove: selection.remove });
    if (result === "invalid") ui.notifications.warn(game.i18n.localize("LOBIA.Item.invalidCategory"));
    if (result === "inUse") ui.notifications.warn(game.i18n.localize("LOBIA.Item.subcategoryInUse"));
    if (result === "saved") this.render();
  }

  /** Remove an unused custom category and its empty catalogue folders. */
  static async #onDeleteItemCategory(event, target) {
    if (!game.user.isGM) return;
    const key = target.dataset.category;
    const category = customItemCategories().find(entry => entry.key === key);
    if (!category) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("LOBIA.Item.deleteCategory") },
      content: `<p>${foundry.utils.escapeHTML(game.i18n.format("LOBIA.Item.deleteCategoryConfirm", { name: itemCategoryName(key) }))}</p>`
    });
    if (!confirmed) return;
    const result = await deleteItemCategory(key);
    if (result === "inUse") ui.notifications.warn(game.i18n.localize("LOBIA.Item.categoryInUse"));
    if (result === "deleted") this.render();
  }

  /** Remove an item from the inventory, after confirmation. */
  static async #onDeleteItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("LOBIA.Item.deleteTitle") },
      content: `<p>${game.i18n.format("LOBIA.Item.deleteConfirm", { name: item.name })}</p>`
    });
    if (confirmed) await item.delete();
  }

  /** Step an item's quantity up or down (never below 0). */
  static async #onAdjustQuantity(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const next = Math.max(0, (item.system.quantity ?? 0) + Number(target.dataset.delta ?? 1));
    await item.update({ "system.quantity": next });
  }
}
