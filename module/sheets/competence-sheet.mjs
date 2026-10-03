const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

import { SKILL_CATEGORIES } from "../data/item-competence.mjs";

/** Sheet for one trainer skill: its stable key, type, category and three effect tiers. */
export default class LobiaCompetenceSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "item", "competence"],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  /** @override */
  static PARTS = {
    main: { template: "systems/lobia/templates/item/competence.hbs", root: true }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.typeChoices = CONFIG.LOBIA.types;
    context.categoryChoices = Object.fromEntries(SKILL_CATEGORIES.map(c => [c, c]));
    return context;
  }
}
