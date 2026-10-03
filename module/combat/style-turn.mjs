import { combatStyleEffects } from "../data/combat-styles.mjs";

async function clearTemporaryStyle(actor) {
  if (!actor || !["pokemon", "trainer"].includes(actor.type)) return;
  if (!combatStyleEffects(actor.system.combatStyle).turnOnly) return;
  await actor.update({ "system.combatStyle": "neutre" });
}

/** Combat v13 fires this after the active turn changes; only the active GM writes. */
export async function resetCombatStyleOnTurnChange(combat, previous, current) {
  if (!game.user.isActiveGM || !(previous?.round > 0) || !previous.combatantId) return;
  if (previous.round === current?.round && previous.combatantId === current?.combatantId) return;
  try {
    await clearTemporaryStyle(combat.combatants.get(previous.combatantId)?.actor);
  } catch (error) {
    console.error("Lobia | Could not reset temporary combat style", error);
  }
}

/** A deleted encounter has no remaining turns to expire temporary stances. */
export async function resetCombatStylesOnDelete(combat) {
  if (!game.user.isActiveGM) return;
  try {
    for (const combatant of combat.combatants.values()) await clearTemporaryStyle(combatant.actor);
  } catch (error) {
    console.error("Lobia | Could not reset combat styles after encounter", error);
  }
}
