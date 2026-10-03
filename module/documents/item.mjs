/**
 * Extended Item document. Behaviour (using potions, etc.) will be added later.
 */
export default class LobiaItem extends Item {
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if (this.type !== "capacite" || this.system.key) return;
    const slug = String(this.name || "capacite").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "capacite";
    this.updateSource({ "system.key": `custom-${slug}-${foundry.utils.randomID(8).toLowerCase()}` });
  }
}
