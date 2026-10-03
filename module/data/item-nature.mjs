import { LOBIA } from "../config.mjs";

/** A GM-editable Pokémon Nature. Its stable key is what actors store. */
export default class LobiaNature extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    const number = (initial, min, max) => new fields.NumberField({
      required: true, nullable: false, integer: true, initial, min, max
    });
    return {
      key: new fields.StringField({ required: true, blank: false, initial: "nouvelle-nature" }),
      min: number(1, 1, 100),
      max: number(4, 1, 100),
      effects: new fields.SchemaField(Object.fromEntries(
        Object.keys(LOBIA.stats).map(key => [key, number(0)])
      ))
    };
  }
}
