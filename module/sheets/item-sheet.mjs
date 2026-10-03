const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

import { itemTaxonomy, itemCategoryName, itemSubcategoryName } from "../data/item-taxonomy.mjs";

/**
 * ApplicationV2 item sheet (generic "Objet" for now).
 */
export default class LobiaItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "item"],
    position: { width: 480, height: 460 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  /** @override */
  static PARTS = {
    main: {
      template: "systems/lobia/templates/item/item.hbs",
      root: true
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    // One grouped dropdown: an optgroup per big category, its sub-categories inside.
    context.subcategoryOptions = itemTaxonomy().flatMap(cat => cat.subs.map(sub => ({
      value: `${cat.key}-${sub}`,
      label: itemSubcategoryName(`${cat.key}-${sub}`),
      group: itemCategoryName(cat.key)
    })));
    return context;
  }
}
