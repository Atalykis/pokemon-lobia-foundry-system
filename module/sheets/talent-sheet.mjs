import { TALENT_CATEGORIES } from "../packs/talents-data.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/** Editor for one GM-owned Pokémon Talent. */
export default class LobiaTalentSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "item", "talent"],
    position: { width: 540, height: 470 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = { main: { template: "systems/lobia/templates/item/talent.hbs", root: true } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.categoryChoices = Object.fromEntries(TALENT_CATEGORIES.map(c => [c.key, c.name]));
    return context;
  }
}
