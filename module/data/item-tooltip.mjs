import { itemCategoryName, itemSubcategoryName } from "./item-taxonomy.mjs";

/** Shared HTML hover card for embedded objet Items on both actor sheets. */
export function itemTooltip(item) {
  const esc = value => foundry.utils.escapeHTML(String(value ?? ""));
  const sys = item.system;
  const category = itemCategoryName(sys.category);
  const subcategory = itemSubcategoryName(sys.subcategory);
  const description = item.name === "PV Plus" && sys.subcategory === "bonus-accelerateur"
    ? `<p>${esc(game.i18n.localize("LOBIA.Accelerator.pvPlusRule"))}</p>`
    : sys.description ?? "";
  return `<div class="lobia-item-tip">`
    + `<div class="lobia-item-tip-head"><img src="${esc(item.img)}" alt="">`
    + `<strong>${esc(item.name)}</strong><span class="lobia-item-tip-category">${esc(category)}</span></div>`
    + (subcategory ? `<div class="lobia-item-tip-subcategory">${esc(subcategory)}</div>` : "")
    + (sys.price > 0 ? `<div class="lobia-item-tip-price"><small>${esc(game.i18n.localize("LOBIA.Item.price"))}</small><b>${esc(sys.price)} ₽</b></div>` : "")
    + (description ? `<div class="lobia-item-tip-description">${description}</div>` : "")
    + `</div>`;
}
