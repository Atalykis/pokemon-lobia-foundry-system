import { POKEMON_MOVE_CATEGORIES } from "../data/pokemon-moves-data.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class LobiaCapaciteSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "item", "capacite"],
    position: { width: 560, height: 650 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = { main: { template: "systems/lobia/templates/item/capacite.hbs", root: true } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.typeChoices = CONFIG.LOBIA.types;
    context.categoryChoices = Object.fromEntries(POKEMON_MOVE_CATEGORIES.map(c => [c.key, c.name]));
    if (this.item.system.category && !context.categoryChoices[this.item.system.category]) {
      context.categoryChoices[this.item.system.category] = this.item.system.category;
    }
    return context;
  }
}
