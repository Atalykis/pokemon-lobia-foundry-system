import { LOBIA } from "../config.mjs";
import { POKEMON_TREE_NODES } from "./pokemon-tree.mjs";

/** One GM-editable Dominant branch: ten labels and their source-rule tooltips. */
export default class LobiaArbreDominant extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const text = () => new fields.StringField({ required: true, blank: true, initial: "" });
    const nodes = () => new fields.SchemaField(Object.fromEntries(
      Object.keys(POKEMON_TREE_NODES).map(id => [id, text()])));
    return {
      type: new fields.StringField({ required: true, blank: false, initial: "normal",
        choices: Object.keys(LOBIA.types) }),
      labels: nodes(),
      notes: nodes()
    };
  }
}
