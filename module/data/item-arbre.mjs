import { LOBIA } from "../config.mjs";

/**
 * The six per-type bonus labels that fill one type's skill tree.
 * The topology itself is uniform across all 18 types (see tree-template.mjs) and is
 * not editable — only what each bonus node grants.
 */
export const TREE_LABEL_SLOTS = ["statA", "subRecharge", "immunite", "subConnaissance", "statB", "subMaitre"];

/**
 * One type's skill tree. The document's name is a free label for the GM; `type` is
 * what binds it to a tree, and the labels fill that tree's bonus nodes.
 *
 * Numeric self-buffs are recognised from the label text (see LobiaTrainer#applyBonusLabel):
 * "Armure +", "Barrière +", "Physique +", "Spécial +", "Initiative +", "Action +",
 * "Action bonus +", "Réaction +", "Déplacement +". Anything else is narrative.
 */
export default class LobiaArbre extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const label = () => new fields.StringField({ required: true, blank: true, initial: "" });
    return {
      type: new fields.StringField({
        required: true, blank: false, initial: "normal", choices: Object.keys(LOBIA.types)
      }),
      labels: new fields.SchemaField(Object.fromEntries(TREE_LABEL_SLOTS.map(s => [s, label()])))
    };
  }
}
