/**
 * Resolve a d100 roll-under check against a target value.
 * @param {number} total   The d100 result (1-100).
 * @param {number} target  The stat value to roll under.
 * @returns {"critSuccess"|"success"|"failure"|"critFailure"}
 */
export function resolveOutcome(total, target) {
  const crit = CONFIG.LOBIA.crit;
  if (total <= crit.success) return "critSuccess";
  if (total >= crit.failure) return "critFailure";
  return total <= target ? "success" : "failure";
}
