import { LOBIA } from "../config.mjs";

/** A Pokémon move, identified independently of its editable name and category. */
export default class LobiaCapacite extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      key: new fields.StringField({ required: true, blank: true, initial: "" }),
      type: new fields.StringField({ required: true, blank: false, initial: "normal", choices: Object.keys(LOBIA.types) }),
      category: new fields.StringField({ required: true, blank: true, initial: "" }),
      class: new fields.StringField({ required: true, blank: true, initial: "" }),
      damage: new fields.StringField({ required: true, blank: true, initial: "" }),
      difficulty: new fields.StringField({ required: true, blank: true, initial: "" }),
      contact: new fields.StringField({ required: true, blank: true, initial: "" }),
      description: new fields.StringField({ required: true, blank: true, initial: "" })
    };
  }
}
