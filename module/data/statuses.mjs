/** Manual tabletop statuses. Actor ActiveEffects are the single source of truth. */
export const LOBIA_STATUSES = [
  { key: "brulure", img: "icons/svg/fire.svg" },
  { key: "confusion", img: "icons/svg/daze.svg" },
  { key: "empoisonnement", img: "icons/svg/poison.svg" },
  { key: "grave-empoisonnement", img: "icons/svg/acid.svg" },
  { key: "gel", img: "icons/svg/frozen.svg" },
  { key: "somnolence", img: "icons/svg/sleep.svg" },
  { key: "peur", img: "icons/svg/terror.svg" },
  { key: "paralysie", img: "icons/svg/paralysis.svg" },
  { key: "aveuglement", img: "icons/svg/blind.svg" },
  { key: "amour", img: "icons/svg/angel.svg" },
  { key: "provocation", img: "icons/svg/target.svg" },
  { key: "entrave", img: "icons/svg/net.svg" },
  { key: "parasite", img: "icons/svg/degen.svg" },
  { key: "debris-de-pierre", img: "icons/svg/stone-path.svg" },
  { key: "maudit", img: "icons/svg/skull.svg" },
  { key: "ko", img: "icons/svg/unconscious.svg" }
].map(status => ({ ...status, id: `lobia-${status.key}` }));

export const LOBIA_STATUSES_BY_KEY = new Map(LOBIA_STATUSES.map(status => [status.key, status]));

export function statusName(status) {
  return game.i18n.localize(`LOBIA.Status.${status.key}.name`);
}

/** Replace X in XD4/6/8 with the chosen RP level, without automating the rule. */
export function statusRule(status, level) {
  return game.i18n.localize(`LOBIA.Status.${status.key}.rule`)
    .replace(/\bXD([468])\b/g, `${level}D$1`);
}

export function actorStatusEffects(actor) {
  return LOBIA_STATUSES.flatMap(status => [...(actor.effects ?? [])]
    .filter(effect => !effect.disabled && effect.statuses?.size === 1 && effect.statuses.has(status.id))
    .map(effect => ({ status, effect, level: Number(effect.getFlag?.("lobia", "level")
      ?? effect.flags?.lobia?.level) || 1 })));
}
