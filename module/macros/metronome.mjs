import { getPokemonMoves, pokemonMoveCategory } from "../data/pokemon-moves.mjs";
import { pokemonMoveTooltip } from "../data/pokemon-move-tooltip.mjs";

/** Keep the original macro's type-die order; each pool follows Capacités.xlsx row order. */
export const METRONOME_TYPES = ["acier", "combat", "dragon", "eau", "electrik", "fee", "feu", "glace",
  "insecte", "normal", "plante", "poison", "psy", "roche", "sol", "spectre", "tenebres", "vol"];

/** Two fair dice: uniform type, then uniform move among that type's workbook entries. */
export async function rollMetronome({ actor = null, token = null } = {}) {
  const controlled = canvas?.tokens?.controlled ?? [];
  if (controlled.length > 1 && !actor) {
    ui.notifications.warn(game.i18n.localize("LOBIA.Metronome.oneToken"));
    return null;
  }
  token ??= actor ? (controlled.find(entry => entry.actor === actor) ?? null) : (controlled[0] ?? null);
  actor ??= token?.actor ?? game.user.character ?? null;
  const speaker = ChatMessage.getSpeaker({ actor, token });
  const typeRoll = await new Roll(`1d${METRONOME_TYPES.length}`).evaluate();
  const type = METRONOME_TYPES[typeRoll.total - 1];
  const typeName = game.i18n.localize(`LOBIA.Type.${type}`);
  await typeRoll.toMessage({ speaker, flavor: game.i18n.localize("LOBIA.Metronome.typeRoll") });

  const pool = getPokemonMoves().filter(move => move.type === type);
  if (!pool.length) {
    ui.notifications.warn(game.i18n.format("LOBIA.Metronome.noMoves", { type: typeName }));
    return null;
  }
  const moveRoll = await new Roll(`1d${pool.length}`).evaluate();
  const move = pool[moveRoll.total - 1];
  await moveRoll.toMessage({ speaker, flavor: game.i18n.format("LOBIA.Metronome.moveRoll", { type: typeName }) });

  const escape = foundry.utils.escapeHTML;
  const card = pokemonMoveTooltip(move, {
    name: move.name, typeLabel: typeName, categoryLabel: pokemonMoveCategory(move.category), escape,
    labels: Object.fromEntries(["class", "damage", "difficulty", "contact"]
      .map(key => [key, game.i18n.localize(`LOBIA.PokemonMoves.${key}`)]))
  });
  await ChatMessage.create({
    speaker,
    content: `<div class="lobia-metronome-result"><strong>${escape(game.i18n.localize("LOBIA.Metronome.result"))}</strong>${card}</div>`
  });
  return { type, move, typeRoll, moveRoll };
}

/** Shared world Macro, added once; users choose their own hotbar slot. */
export async function setupMetronomeMacro() {
  if (!game.user.isGM) return;
  if (game.macros.some(macro => macro.getFlag("lobia", "metronome"))) {
    console.log("Lobia | Métronome Macro already available");
    return;
  }
  try {
    await Macro.create({
      name: game.i18n.localize("LOBIA.Metronome.macroName"),
      type: "script", img: "icons/svg/d20-grey.svg",
      command: "return game.lobia.rollMetronome({ token, actor });",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED },
      flags: { lobia: { metronome: true } }
    });
    console.log("Lobia | Created shared Métronome Macro");
  } catch (error) {
    console.error("Lobia | Could not create Métronome Macro", error);
    ui.notifications.error(game.i18n.format("LOBIA.Metronome.macroFailed", { error: error.message }));
  }
}
