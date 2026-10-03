const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

import { TREE_LABEL_SLOTS } from "../data/item-arbre.mjs";
import { TREE_DISPLAY_ROWS, TREE_NODES_BY_ID } from "../data/tree-template.mjs";

/**
 * Sheet for one type's skill tree: the six bonus labels, laid out in the same shape
 * the trainer sheet draws, so the GM edits the tree where they see it.
 */
export default class LobiaArbreSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["lobia", "sheet", "item", "arbre"],
    position: { width: 520, height: 640 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  /** @override */
  static PARTS = {
    main: { template: "systems/lobia/templates/item/arbre.hbs", root: true }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.typeChoices = CONFIG.LOBIA.types;

    // Same rows as the trainer sheet: bonus nodes become inputs, the rest are fixed.
    context.rows = TREE_DISPLAY_ROWS.map(ids => ids.map(id => {
      const node = TREE_NODES_BY_ID[id];
      const editable = node.kind === "bonus";
      return {
        id,
        kind: node.kind,
        editable,
        slot: node.labelSlot ?? null,
        value: editable ? (this.item.system.labels[node.labelSlot] ?? "") : null,
        label: editable ? null : game.i18n.localize(`LOBIA.Tree.${node.kind}`)
      };
    }));
    context.slots = TREE_LABEL_SLOTS;
    return context;
  }
}
