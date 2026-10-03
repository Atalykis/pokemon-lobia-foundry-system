/** Hotbar-accessible stat checks and optional damage for the selected Lobia token. */
import { combatStyleDamageFormula } from "../data/combat-styles.mjs";

const { DialogV2 } = foundry.applications.api;
const tr = key => game.i18n.localize(`LOBIA.QuickRoll.${key}`);

function countFrom(form) {
  const value = Number(form.elements.quantity.value);
  if (Number.isInteger(value) && value >= 1 && value <= 20) return value;
  ui.notifications.warn(tr("invalidQuantity"));
  return null;
}

function selectedActor({ token, actor } = {}) {
  const controlled = canvas?.tokens?.controlled ?? [];
  if (controlled.length > 1) {
    ui.notifications.warn(tr("oneToken"));
    return null;
  }
  const chosen = controlled[0] ?? token;
  const subject = chosen?.actor ?? actor ?? game.user.character;
  if (!subject || typeof subject.rollStat !== "function") {
    ui.notifications.warn(tr("selectActor"));
    return null;
  }
  if (!subject.isOwner && !game.user.isGM) {
    ui.notifications.warn(tr("noPermission"));
    return null;
  }
  return { actor: subject, token: chosen?.actor === subject ? chosen : null };
}

async function rollDamage(actor, token) {
  const esc = foundry.utils.escapeHTML;
  const options = [`<option value="0">${esc(tr("none"))}</option>`,
    ...Object.entries(actor.system.derived ?? {}).map(([key, value]) => {
      const total = Number(value.total ?? 0);
      if (!Number.isFinite(total)) return "";
      const label = game.i18n.localize(`LOBIA.Derived.${key}`);
      return `<option value="${total}">${esc(label)} (${total >= 0 ? "+" : ""}${total})</option>`;
    })].join("");
  const selection = await DialogV2.wait({
    window: { title: tr("damageTitle") }, position: { width: 490 },
    content: `<div class="lobia-quick-roll-fields">`
      + `<label>${esc(tr("quantity"))}<input name="quantity" type="number" min="1" max="20" step="1" value="1"></label>`
      + `<label>${esc(tr("damageModifier"))}<select name="modifier">${options}</select></label>`
      + `</div>`,
    buttons: [4, 6, 8, 10, 12, 20].map(faces => ({
      action: `d${faces}`, label: `D${faces}`, icon: `fa-solid fa-dice-d${faces}`,
      callback: (_event, button) => {
        const quantity = countFrom(button.form);
        const modifier = Number(button.form.elements.modifier.value);
        return quantity === null || !Number.isFinite(modifier) ? null : { quantity, faces, modifier };
      }
    }))
  });
  if (!selection || typeof selection !== "object") return null;
  const { quantity, faces, modifier } = selection;
  const baseFormula = `${quantity}d${faces}${modifier < 0 ? modifier : `+${modifier}`}`;
  const roll = await new Roll(combatStyleDamageFormula(baseFormula, actor.system.combatStyle)).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor, token }),
    flavor: game.i18n.format("LOBIA.QuickRoll.damageFlavor", { name: actor.name })
  });
  return roll;
}

/** Run via the world Macro, or directly with game.lobia.quickRoll(). */
export async function quickRoll(scope = {}) {
  const selected = selectedActor(scope);
  if (!selected) return null;
  const { actor, token } = selected;
  const esc = foundry.utils.escapeHTML;
  const stats = Object.keys(actor.system.stats ?? {});
  if (!stats.length) return null;
  const selection = await DialogV2.wait({
    window: { title: game.i18n.format("LOBIA.QuickRoll.statTitle", { name: actor.name }) },
    position: { width: stats.length > 5 ? 650 : 520 },
    content: `<div class="lobia-quick-roll-fields">`
      + `<label>${esc(tr("quantity"))}<input name="quantity" type="number" min="1" max="20" step="1" value="1"></label>`
      + `<label>${esc(tr("situational"))}<input name="modifier" type="number" step="1" value="0"></label>`
      + `</div>`,
    buttons: stats.map(key => ({
      action: key, label: game.i18n.localize(`LOBIA.Stat.${key}`),
      callback: (_event, button) => {
        const quantity = countFrom(button.form);
        const modifier = Number(button.form.elements.modifier.value);
        if (quantity === null || !Number.isInteger(modifier)) {
          if (quantity !== null) ui.notifications.warn(tr("invalidModifier"));
          return null;
        }
        return { key, quantity, modifier };
      }
    }))
  });
  if (!selection || typeof selection !== "object") return null;
  for (let i = 0; i < selection.quantity; i++) {
    await actor.rollStat(selection.key, { modifier: selection.modifier });
  }
  const wantsDamage = await DialogV2.confirm({
    window: { title: tr("damageTitle") },
    content: `<p>${esc(tr("askDamage"))}</p>`,
    yes: { label: tr("yes") }, no: { label: tr("no") }
  });
  return wantsDamage ? rollDamage(actor, token) : null;
}

/** Create one shared world Macro; each user can drag it to a preferred hotbar slot. */
export async function setupQuickRollMacro() {
  if (!game.user.isGM) return;
  if (game.macros.some(macro => macro.getFlag("lobia", "quickRoll"))) {
    console.log("Lobia | Quick-roll Macro already available");
    return;
  }
  try {
    await Macro.create({
      name: tr("macroName"), type: "script", img: "icons/svg/d20-grey.svg",
      command: "return game.lobia.quickRoll({ token, actor });",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED },
      flags: { lobia: { quickRoll: true } }
    });
    console.log("Lobia | Created shared quick-roll Macro");
  } catch (error) {
    console.error("Lobia | Could not create quick-roll Macro", error);
    ui.notifications.error(game.i18n.format("LOBIA.QuickRoll.macroFailed", { error: error.message }));
  }
}
