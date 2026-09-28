# Game Plan — Ilha Selvagem / Meu Game de Sobrevivência

## V0.2 migration

The first Manus-generated prototype is treated as working source material, not as the permanent architecture.

### Completed foundation work
- Babylon.js replaced by Phaser 3.90.0.
- Manus Vite runtime/debug/storage integration removed.
- Manus-hosted asset URLs removed from gameplay.
- Primary persistence migrated from localStorage to IndexedDB.
- Old V1 localStorage saves can be migrated into the new IndexedDB store.
- Existing survival loop preserved: movement, resources, animals, weapons, combat, crafting, campfire, cooking, hunger, thirst and health.

### Validation priorities
1. Confirm Phaser scene boot, camera follow and input.
2. Confirm collection, crafting, combat and cooking.
3. Confirm IndexedDB save/load across browser reload.
4. Confirm no network/backend is required for game logic.
5. Replace temporary procedural visuals with repository-owned art once the engine migration is stable.

## Post-migration roadmap
- Move final art/audio to `public/assets`.
- Improve animal AI with explicit states.
- Add real player/animal animations and attack/death feedback.
- Improve island biome composition.
- Add richer effects and audio.
- Persist broader world state.
- Only then expand to new mechanics such as construction, farming, fishing and additional biomes.
