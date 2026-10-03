/** Foundry v13 compares only IDs when dropping entries into a directory.
 * A Pokémon template can share its ID with a world Actor from the migrated world.
 * In that case the default handler skips creation and sorts the compendium Actor
 * against world Actors, which sends their IDs to the compendium update backend.
 */
export function allowCompendiumActorCopies() {
  const directory = foundry.applications.sidebar.tabs.ActorDirectory.prototype;
  const entryAlreadyExists = directory._entryAlreadyExists;
  directory._entryAlreadyExists = function(entry) {
    if (entry.inCompendium) return false;
    return entryAlreadyExists.call(this, entry);
  };
}
