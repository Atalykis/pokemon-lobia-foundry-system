import { TALENT_CATEGORIES } from "../packs/talents-data.mjs";

/** One Pokémon Talent. Name is the Item name; key is stable across renames. */
export default class LobiaTalent extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      key: new fields.StringField({ required: true, blank: false, initial: "nouveau-talent" }),
      category: new fields.StringField({
        required: true, blank: false, initial: TALENT_CATEGORIES[0].key,
        choices: TALENT_CATEGORIES.map(c => c.key)
      }),
      effect: new fields.StringField({ required: true, blank: true, initial: "" })
    };
  }
}
