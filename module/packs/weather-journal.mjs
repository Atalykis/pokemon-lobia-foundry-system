import { LOBIA } from "../config.mjs";
import { LOBIA_WEATHERS } from "../data/weather-data.mjs";
import { ensureRulebookPack } from "./rulebook.mjs";

const ENTRY_KEY = "weather";
const pageKey = key => `weather-${key}`;
const escape = value => foundry.utils.escapeHTML(value);

/** Render the authored text verbatim as safe HTML, with a chip for its associated type. */
export function renderWeatherPage(weather) {
  const type = game.i18n.localize(LOBIA.types[weather.type]);
  return `<div class="lobia-weather-page lobia-type-${weather.type}">`
    + `<h2>${escape(weather.name)}</h2>`
    + `<p class="lobia-weather-type">${escape(type)}</p>`
    + weather.paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`).join("")
    + "</div>";
}

function pages() {
  return LOBIA_WEATHERS.map((weather, index) => ({
    name: weather.name,
    type: "text",
    sort: (index + 1) * 1000,
    text: { content: renderWeatherPage(weather) },
    flags: { lobia: { weatherKey: pageKey(weather.key) } }
  }));
}

/** Seed one player-readable Météo JournalEntry in the existing Guide du Dresseur pack. */
export async function setupWeatherJournal({ force = false } = {}) {
  if (!game.user.isGM) return { created: 0, updated: 0, skipped: true };
  const { pack } = await ensureRulebookPack();
  if (!pack) return { created: 0, updated: 0, skipped: true };
  const restoreLock = pack.locked;
  try {
    const documents = await pack.getDocuments();
    const entry = documents.find(document => document.getFlag("lobia", "key") === ENTRY_KEY)
      ?? documents.find(document => document.name === "Météo");
    if (!entry) {
      if (restoreLock) await pack.configure({ locked: false });
      await JournalEntry.implementation.createDocuments([{
        name: "Météo", sort: 19000, pages: pages(), flags: { lobia: { key: ENTRY_KEY } }
      }], { pack: pack.collection });
      console.log(`Lobia | Added Météo journal (${LOBIA_WEATHERS.length} pages) to ${pack.collection}`);
      return { created: LOBIA_WEATHERS.length, updated: 0, skipped: false };
    }
    if (!entry.getFlag("lobia", "key") && (entry.pages.size ?? entry.pages.length)) {
      console.log("Lobia | An authored Météo journal already exists; leaving it untouched");
      return { created: 0, updated: 0, skipped: true };
    }
    if (!force && entry.getFlag("lobia", "key")) {
      console.log("Lobia | Météo journal already present; keeping GM edits");
      return { created: 0, updated: 0, skipped: true };
    }
    if (restoreLock) await pack.configure({ locked: false });
    if (!entry.getFlag("lobia", "key")) await entry.update({ "flags.lobia.key": ENTRY_KEY });

    // Explicit force refreshes only seeded pages. A GM-added page is never changed.
    const existingPages = new Map([...entry.pages]
      .filter(page => page.getFlag("lobia", "weatherKey"))
      .map(page => [page.getFlag("lobia", "weatherKey"), page]));
    const create = [], update = [];
    for (const page of pages()) {
      const current = existingPages.get(page.flags.lobia.weatherKey);
      if (current) {
        if (current.name !== page.name || current.text?.content !== page.text.content) {
          update.push({ _id: current.id, name: page.name, text: page.text });
        }
      } else create.push(page);
    }
    if (create.length) await entry.createEmbeddedDocuments("JournalEntryPage", create);
    if (update.length) await entry.updateEmbeddedDocuments("JournalEntryPage", update);
    console.log(`Lobia | Météo journal refreshed: ${create.length} pages added, ${update.length} updated`);
    return { created: create.length, updated: update.length, skipped: false };
  } catch (error) {
    console.error("Lobia | Could not seed Météo journal", error);
    ui.notifications.error(game.i18n.format("LOBIA.Item.packFailed", { error: error.message }));
    return { created: 0, updated: 0, skipped: false };
  } finally {
    if (restoreLock && !pack.locked) {
      try { await pack.configure({ locked: true }); }
      catch (error) { console.error("Lobia | Could not re-lock Guide du Dresseur", error); }
    }
  }
}
