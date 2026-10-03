import { DEFAULT_SUBCATEGORY, categoryOf } from "./item-taxonomy.mjs";

/**
 * An item of the Lobia catalogue: a name (the document's own), a price and a full
 * description, filed under exactly one sub-category from which its big category is
 * derived.
 */
export default class LobiaObjet extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // The single source of truth for filing: "<category>-<sub>", e.g. "arme-shooter".
      subcategory: new fields.StringField({
        required: true, blank: false, initial: DEFAULT_SUBCATEGORY
      }),

      // The catalogue data.
      price: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      description: new fields.HTMLField({ required: false, blank: true }),

      // Inventory bookkeeping — not part of the catalogue entry, only of a carried copy.
      quantity: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 0 }),
      // Weapon-slot index (0-2) for items carried in a weapon/accessory slot; null otherwise.
      slot: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 })
    };
  }

  /**
   * Fold the earlier flat `category` (+ `effet`/`soin`) shape into the two-level taxonomy.
   * @override
   */
  static migrateData(source) {
    if (source && !source.subcategory && source.category) {
      const legacy = {
        arme: "arme-knocker",
        accessoire: "accessoire-boost",
        soin: "bonus-soin",
        combat: "bonus-combat",
        pokeball: "pokeball-standard",
        recharge: "recharge-standard",
        rare: "bonus-soin",
        autre: "bonus-soin"
      };
      source.subcategory = legacy[source.category] ?? DEFAULT_SUBCATEGORY;
    }
    return super.migrateData(source);
  }

  /** The big category this item belongs to, derived from its sub-category. */
  get category() {
    return categoryOf(this.subcategory);
  }

  /** Is this item carried in one of the 3 weapon slots (weapon or accessory)? */
  get isEquipment() {
    const c = this.category;
    return (c === "arme") || (c === "accessoire");
  }
}
