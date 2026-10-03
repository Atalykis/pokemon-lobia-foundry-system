import { TYPE_EFFECT, attackMultiplier } from "../data/type-chart.mjs";

/** Attacking types run down the rows, defending types across the columns. */
export const TYPE_CHART_ORDER = ["normal", "feu", "eau", "electrik", "plante", "glace", "combat", "poison",
  "sol", "vol", "psy", "insecte", "roche", "spectre", "dragon", "tenebres", "acier", "fee"];
if (TYPE_CHART_ORDER.length !== 18 || new Set(TYPE_CHART_ORDER).size !== Object.keys(TYPE_EFFECT).length
  || TYPE_CHART_ORDER.some(type => !TYPE_EFFECT[type])) {
  throw new Error("The type chart must contain exactly the 18 Lobia types");
}

/** Render from the same rules the actor header uses, never from a second effectiveness table. */
export function typeChartContent() {
  const esc = foundry.utils.escapeHTML;
  const tr = key => game.i18n.localize(`LOBIA.TypeChart.${key}`);
  const names = Object.fromEntries(TYPE_CHART_ORDER.map(type => [type, game.i18n.localize(`LOBIA.Type.${type}`)]));
  const headers = TYPE_CHART_ORDER.map(type =>
    `<th scope="col" class="lobia-chart-type lobia-type-${type}" title="${esc(names[type])}" aria-label="${esc(names[type])}">${esc(names[type].slice(0, 3))}</th>`).join("");
  const rows = TYPE_CHART_ORDER.map(attack => {
    const cells = TYPE_CHART_ORDER.map(defense => {
      const multiplier = attackMultiplier(attack, defense);
      const value = multiplier === 0.5 ? "½" : String(multiplier);
      const kind = multiplier === 2 ? "strong" : multiplier === 0.5 ? "weak"
        : multiplier === 0 ? "immune" : "neutral";
      const detail = `${names[attack]} → ${names[defense]} : ${value}×`;
      return `<td class="lobia-chart-${kind}" title="${esc(detail)}" aria-label="${esc(detail)}">${value}</td>`;
    }).join("");
    return `<tr><th scope="row" class="lobia-chart-type lobia-type-${attack}">${esc(names[attack])}</th>${cells}</tr>`;
  }).join("");
  return `<div class="lobia-type-chart">`
    + `<div class="lobia-type-chart-legend">`
    + `<span><b class="lobia-chart-strong">2</b>${esc(tr("strong"))}</span>`
    + `<span><b class="lobia-chart-weak">½</b>${esc(tr("weak"))}</span>`
    + `<span><b class="lobia-chart-immune">0</b>${esc(tr("immune"))}</span>`
    + `<span><b class="lobia-chart-neutral">1</b>${esc(tr("neutral"))}</span>`
    + `</div>`
    + `<div class="lobia-type-chart-scroll"><table>`
    + `<thead><tr><th class="lobia-type-chart-corner">${esc(tr("corner"))}</th>${headers}</tr></thead>`
    + `<tbody>${rows}</tbody></table></div>`
    + `<p class="lobia-type-chart-hint">${esc(tr("hint"))}</p>`
    + `</div>`;
}

export function showTypeChart() {
  return new foundry.applications.api.DialogV2({
    classes: ["dialog", "lobia-type-chart-dialog"],
    window: { title: game.i18n.localize("LOBIA.TypeChart.title"), resizable: true },
    position: { width: Math.min(1080, window.innerWidth - 24) },
    content: typeChartContent(),
    buttons: [{ action: "close", label: game.i18n.localize("LOBIA.TypeChart.close"), default: true }]
  }).render({ force: true });
}

/** Create once for all users; each player chooses their own hotbar slot. */
export async function setupTypeChartMacro() {
  if (!game.user.isGM) return;
  if (game.macros.some(macro => macro.getFlag("lobia", "typeChart"))) {
    console.log("Lobia | Type-chart Macro already available");
    return;
  }
  try {
    await Macro.create({
      name: game.i18n.localize("LOBIA.TypeChart.macroName"), type: "script",
      img: "icons/svg/d20-grey.svg", command: "return game.lobia.showTypeChart();",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED },
      flags: { lobia: { typeChart: true } }
    });
    console.log("Lobia | Created shared type-chart Macro");
  } catch (error) {
    console.error("Lobia | Could not create type-chart Macro", error);
    ui.notifications.error(game.i18n.format("LOBIA.TypeChart.macroFailed", { error: error.message }));
  }
}
