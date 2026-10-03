/** HTML hover card for a move matched to a Pokédex tree node. */
export function pokemonMoveTooltip(move, { name, note, typeLabel, categoryLabel, labels, escape }) {
  const text = value => escape(String(value ?? ""));
  const lines = value => text(value).replace(/\r?\n/g, "<br>");
  const field = (label, value) => `<span class="lobia-move-tip-field"><small>${text(label)}</small><b>${text(value)}</b></span>`;
  return `<div class="lobia-move-tip lobia-type-${move.type}">`
    + `<div class="lobia-move-tip-head"><strong>${text(name)}</strong><span class="lobia-move-tip-type">${text(typeLabel)}</span></div>`
    + (categoryLabel ? `<div class="lobia-move-tip-category">${text(categoryLabel)}</div>` : "")
    + `<div class="lobia-move-tip-grid">`
    + field(labels.class, move.class) + field(labels.damage, move.damage)
    + field(labels.difficulty, move.difficulty) + field(labels.contact, move.contact)
    + `</div>`
    + (move.description && move.description !== "---" ? `<p class="lobia-move-tip-description">${lines(move.description)}</p>` : "")
    + (note ? `<p class="lobia-move-tip-note">${lines(note)}</p>` : "")
    + `</div>`;
}
