/** Keep GM notes in a JournalEntry with no player ownership, not in replicated Actor data. */
const notesFor = actor => [...game.journal].find(entry => entry.getFlag("lobia", "notesActor") === actor.uuid);

export function gmNotesFor(actor) {
  const html = notesFor(actor)?.pages.contents[0]?.text?.content ?? "";
  return new DOMParser().parseFromString(html, "text/html").querySelector("pre")?.textContent ?? "";
}

export async function saveGmNotes(actor, text) {
  if (!game.user.isGM) return;
  const html = `<pre>${foundry.utils.escapeHTML(text)}</pre>`;
  const entry = notesFor(actor);
  if (entry) {
    const page = entry.pages.contents[0];
    if (page) await page.update({ "text.content": html });
    else await entry.createEmbeddedDocuments("JournalEntryPage", [{ name: "Notes MJ", type: "text", text: { content: html } }]);
  } else {
    await JournalEntry.create({
      name: `Notes MJ — ${actor.name}`,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: { lobia: { notesActor: actor.uuid } },
      pages: [{ name: "Notes MJ", type: "text", text: { content: html } }]
    });
  }
}
