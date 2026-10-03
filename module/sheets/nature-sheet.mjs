const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class LobiaNatureSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "item", "nature"],
    position: { width: 460, height: 520 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = { main: { template: "systems/lobia/templates/item/nature.hbs", root: true } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.statFields = Object.keys(CONFIG.LOBIA.stats).map(key => ({
      key, label: game.i18n.localize(`LOBIA.Stat.${key}`), value: this.item.system.effects[key]
    }));
    return context;
  }
}
