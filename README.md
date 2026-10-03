# Pokémon Lobia — Foundry VTT System

A custom Pokémon tabletop RPG system for **Foundry VTT v13**, built around d100 rules. It includes Trainer and Pokémon sheets, combat and progression mechanics, Pokédex species and talent data, and a bundled Pokémon compendium. The interface is available in French and English.

## Install

Copy this repository into `Data/systems/lobia` in your Foundry user data directory, then restart Foundry and enable **Pokémon Lobia** in your world. A GM login seeds the system's compendia and updates the bundled Pokémon templates.

## Repository layout

- `module/` — rules, data models, sheets, and compendium seeders.
- `templates/`, `styles/`, `lang/` — interface templates, styling, and translations.
- `assets/` — Pokémon portraits and weather artwork.
- `packs/pokemons/` — bundled Pokémon Actor compendium.
- `tools/` — offline Pokédex extraction scripts and checks; see `tools/README.md`.
