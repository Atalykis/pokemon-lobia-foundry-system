import { POKEMON_TREE_ROWS } from "../data/pokemon-tree.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class LobiaArbreDominantSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "item", "arbre-dominant"],
    position: { width: 650, height: 760 },
    window: { resizable: true }, form: { submitOnChange: true }
  };

  static PARTS = {
    main: { template: "systems/lobia/templates/item/arbre-dominant.hbs", root: true }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.typeChoices = CONFIG.LOBIA.types;
    context.rows = POKEMON_TREE_ROWS.map(row => row.map(id => ({
      id, label: this.item.system.labels[id] ?? "", note: this.item.system.notes[id] ?? ""
    })));
    return context;
  }
}
