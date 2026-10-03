import { LOBIA } from "../config.mjs";
import { LEGACY_SKILL_KEYS } from "./skill-key-migrations.mjs";

/** Trainer skill categories. */
export const SKILL_CATEGORIES = [
  "Attaque reçu", "Recharge", "Statut", "Bonus Stat", "Météo", "Conditionnel", "Danger", "Actif"
];

/**
 * One trainer skill ("Compétence Dresseur"). The document's name is the skill name;
 * everything else lives here. A trainer owns a skill at tier 1, 2 or 3 (MAX) and the
 * matching `tiers` entry is what the sheet shows.
 *
 * `key` is what an actor stores in `system.skills`. It is a stable slug independent
 * from the editable name, type, category and display order.
 */
export default class LobiaCompetence extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // Which type tree this skill belongs to.
      type: new fields.StringField({
        required: true, blank: false, initial: "normal", choices: Object.keys(LOBIA.types)
      }),
      key: new fields.StringField({
        required: true, blank: false, initial: "normal-nouvelle-competence"
      }),
      category: new fields.StringField({ required: true, blank: true, initial: "" }),

      // The three effect tiers. Tier 3 is displayed as MAX.
      tiers: new fields.SchemaField({
        1: new fields.StringField({ required: true, blank: true, initial: "" }),
        2: new fields.StringField({ required: true, blank: true, initial: "" }),
        3: new fields.StringField({ required: true, blank: true, initial: "" })
      })
    };
  }

  /** @override */
  static migrateData(source) {
    if (!source.key && source.type && source.col) {
      source.key = LEGACY_SKILL_KEYS[`${source.type}-${source.col}`]
        ?? `${source.type}-competence-${String(source.col).toLowerCase()}`;
    }
    delete source.col;
    return super.migrateData(source);
  }
}
