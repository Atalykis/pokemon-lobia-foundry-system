/** Preserve a Pokémon's original species while making its nickname the actor's name. */
export function pokemonIdentityUpdates(actor, speciesName = actor.system?.species?.name || actor.name) {
  const species = String(speciesName ?? "").trim();
  const nickname = String(actor.system?.identity?.nickname ?? "").trim() || species;
  return {
    ...(!actor.system?.species?.name && species ? { "system.species.name": species } : {}),
    ...(actor.system?.identity?.nickname !== nickname ? { "system.identity.nickname": nickname } : {}),
    ...(actor.name !== nickname ? { name: nickname } : {})
  };
}

/** Idempotent migration of captured Pokémon (including custom species) on GM load. */
export async function migrateWorldPokemonIdentity() {
  if (!game.user.isGM) return;
  for (const actor of game.actors) {
    if (actor.type !== "pokemon" || actor.pack) continue;
    const updates = pokemonIdentityUpdates(actor);
    if (Object.keys(updates).length) {
      try { await actor.update(updates); }
      catch (error) { console.error(`Lobia | Could not migrate Pokémon ${actor.name}`, error); }
    }
  }
}
